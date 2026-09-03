// 资讯读取与外部搜索封装：Tavily 可用时真实调用，否则确定性回退并落库。
// 资讯按 URL 或“标题 + 来源 + 发布时间”去重，并用 DeepSeek 逐条判定情绪与影响周期。
import { cacheGetOrSet, cacheInvalidatePrefix } from "@/lib/cache";
import { recordExternalCall } from "@/lib/observability";
import { saveNewsSnapshot } from "@/lib/r2";
import { store } from "@/lib/store";
import type { NewsItem, NewsSentiment, Stock } from "@/lib/shared/types";

const NEWS_TTL_MS = 5 * 60_000;
const SHORT_IMPACT_DAYS = 7;
const LONG_IMPACT_DAYS = 30;

/** Tavily 是否已配置真实密钥。 */
function hasTavilyKey(): boolean {
  const apiKey = process.env.TAVILY_API_KEY;
  return Boolean(apiKey && apiKey !== "replace-me");
}

/** 判断资讯是否为本地演示降级数据。 */
function isDemoNewsItem(item: NewsItem): boolean {
  return item.source.startsWith("演示");
}

/** 生成稳定短哈希，用于资讯去重标识。 */
function shortHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

/** 从标题与标签中识别长期资讯，供异常影响周期回退使用。 */
const LONG_TERM_HINTS = ["长期", "政策", "行业", "规划", "战略", "财报", "年报", "并购", "重组"];

function isLongTerm(tags: string[]): boolean {
  return tags.some((tag) => LONG_TERM_HINTS.some((hint) => tag.includes(hint)));
}

/** 校验情绪字段，非法值回退为中性。 */
function normalizeSentiment(value: unknown): NewsSentiment {
  return value === "positive" || value === "negative" || value === "neutral"
    ? value
    : "neutral";
}

/** 校验置信度并限制在 0 到 1 之间。 */
function normalizeConfidence(value: unknown, fallback = 0.75): number {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(1, Math.max(0, number));
}

/** 校验标签，非法值回退为空数组。 */
function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
}

/** 修正影响周期：短期异常回退 7 天，长期异常回退 30 天。 */
function normalizeImpactDays(value: unknown, tags: string[]): number {
  const longTerm = isLongTerm(tags);
  const fallback = longTerm ? LONG_IMPACT_DAYS : SHORT_IMPACT_DAYS;
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }

  if (longTerm) {
    if (number < 14 || number > 365) {
      return LONG_IMPACT_DAYS;
    }
    return Math.round(number);
  }

  if (number > 14) {
    return SHORT_IMPACT_DAYS;
  }
  return Math.round(number);
}

/** 根据标题关键词给出本地确定性分类。 */
function classifyTitle(title: string): {
  sentiment: NewsSentiment;
  impactDays: number;
  tags: string[];
} {
  const positive = /增长|预增|突破|中标|回购|签约|提升|利好|扭亏|创新高/.test(title);
  const negative = /下滑|预亏|处罚|立案|减持|诉讼|风险|亏损|停产|下调/.test(title);
  const longTerm = /政策|行业|规划|战略|财报|年报|并购|重组/.test(title);

  return {
    sentiment: positive && !negative ? "positive" : negative && !positive ? "negative" : "neutral",
    impactDays: longTerm ? LONG_IMPACT_DAYS : SHORT_IMPACT_DAYS,
    tags: longTerm ? ["长期", "重点观察"] : ["短期"],
  };
}

/** 从 URL 中提取可读来源；无法识别时返回 Tavily。 */
function extractSource(url?: string): string {
  if (!url) {
    return "Tavily";
  }
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname || "Tavily";
  } catch {
    return "Tavily";
  }
}

/** 将可能为空或非法的日期转为可用的 ISO 字符串。 */
function toIsoDate(value: string | undefined, fallback: Date): string {
  if (!value) {
    return fallback.toISOString();
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString() : parsed.toISOString();
}

/** 清洗外部资讯摘要，避免展示乱码、导航文本和超长网页正文。 */
function cleanExternalSummary(
  summary: string | undefined,
  source: string,
  title: string,
): string {
  const normalized = (summary ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const looksGarbled =
    /ï¿½|Ã|Â|â€|å|ç|æ|ä¸­å›½|è‚¡ç¥¨/i.test(normalized) ||
    normalized.includes("| |");

  if (!normalized || normalized.length > 180 || looksGarbled || /Image \d+/i.test(normalized)) {
    return `${title}。来源：${source || "外部资讯"}，请打开原文查看完整内容。`;
  }

  return normalized.slice(0, 180);
}

/** 判断文本是否呈现 UTF-8 被误按 Latin-1/GBK 解码后的典型乱码。 */
function looksGarbled(value: string): boolean {
  return (
    /ï¿½|Ã|Â|â€|å|ç|æ|ä¸­å›½|è‚¡ç¥¨|æ²ª|æ·±/i.test(value) ||
    /[\u00c0-\u00ff]{3,}/.test(value)
  );
}

/** 清洗外部资讯标题，避免展示乱码、导航文本和超长标题。 */
function cleanExternalTitle(title: string | undefined, source: string): string {
  const normalized = (title ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized || normalized.length > 120 || looksGarbled(normalized)) {
    return source || "外部资讯";
  }
  return normalized.slice(0, 120);
}

/** 对已落库或新抓取的资讯做统一清洗，避免历史脏数据继续展示。 */
function sanitizeNewsItem(item: NewsItem): NewsItem {
  const title = cleanExternalTitle(item.title, item.source);
  return {
    ...item,
    title,
    summary: cleanExternalSummary(item.summary, item.source, title),
  };
}

/** 资讯去重键：优先 URL，否则使用“标题 + 来源 + 发布时间”。 */
function dedupeKey(item: Pick<NewsItem, "url" | "title" | "source" | "published_at">): string {
  const url = item.url.trim();
  if (url) {
    return `url:${url}`;
  }
  return `meta:${shortHash(`${item.title.trim()}|${item.source.trim()}|${item.published_at}`)}`;
}

/** 对资讯数组按 URL 或标题 + 来源 + 发布时间去重。 */
function dedupeNewsItems(items: NewsItem[]): NewsItem[] {
  const seen = new Map<string, NewsItem>();
  for (const item of items) {
    const key = dedupeKey(item);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

/** 生成确定性资讯，保证无外部网络时也有可展示内容。 */
function buildDeterministicNews(code: string, stock: Stock): NewsItem[] {
  const now = Date.now();
  const templates = [
    {
      title: `${stock.name}发布最新经营动态`,
      summary: "公司披露近期经营与重点业务进展，内容为本地演示数据，仅用于链路验收。",
      source: "演示资讯源",
    },
    {
      title: `${stock.name}所在行业政策持续受到市场关注`,
      summary: "行业政策与景气度变化可能影响市场预期，需要结合基本面与情绪综合判断。",
      source: "演示资讯源",
    },
    {
      title: `${stock.name}资金面出现结构性波动`,
      summary: "盘面成交与资金流向呈现结构性变化，短线交易者关注量价配合情况。",
      source: "演示行情摘要",
    },
    {
      title: `${stock.name}机构研报更新风险提示`,
      summary: "机构研报强调盈利预期、估值与外部环境等不确定性，投资者需独立评估。",
      source: "演示研报摘要",
    },
  ];

  return templates.map((item, index) => {
    const classification = classifyTitle(item.title);
    const publishedAt = new Date(now - index * 6 * 60 * 60_000).toISOString();
    const impactDays = classification.impactDays;
    return {
      id: `news-${code}-${shortHash(dedupeKey({
        url: `https://example.com/news/${code}/${index + 1}`,
        title: item.title,
        source: item.source,
        published_at: publishedAt,
      }))}`,
      code,
      title: item.title,
      summary: item.summary,
      url: `https://example.com/news/${code}/${index + 1}`,
      source: item.source,
      published_at: publishedAt,
      fetched_at: new Date(now).toISOString(),
      sentiment: classification.sentiment,
      confidence: 0.7 + index * 0.05,
      impact_days: impactDays,
      expire_at: new Date(now + impactDays * 24 * 60 * 60_000).toISOString(),
      tags: classification.tags,
      status: "active",
      pinned: false,
    };
  });
}

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  published_date?: string;
}

/** 调用 Tavily 搜索；未配置密钥时返回 null。 */
async function fetchNewsFromTavily(code: string, stock: Stock): Promise<NewsItem[] | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === "replace-me") {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_000);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `${stock.name} ${code} 公告 业绩 行业 风险`,
        max_results: 8,
        search_depth: "basic",
        include_answer: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      clearTimeout(timer);
      recordExternalCall(false);
      return null;
    }

    const payload = (await response.json()) as { results?: TavilyResult[] };
    clearTimeout(timer);
    recordExternalCall(true);
    const results = payload.results ?? [];
    if (results.length === 0) {
      return [];
    }

    const now = Date.now();
    return results.slice(0, 8).map((item, index) => {
      const title = item.title?.trim() || `${stock.name}相关资讯 ${index + 1}`;
      const url = item.url?.trim() || `https://example.com/news/${code}/${index + 1}`;
      const source = extractSource(url);
      const summary = cleanExternalSummary(item.content, source, title);
      const publishedAt = toIsoDate(item.published_date, new Date(now - index * 2 * 60 * 60_000));
      const classification = classifyTitle(title);
      const impactDays = classification.impactDays;

      return {
        id: `news-${code}-${shortHash(dedupeKey({ url, title, source: extractSource(url), published_at: publishedAt }))}`,
        code,
        title,
        summary,
        url,
        source,
        published_at: publishedAt,
        fetched_at: new Date(now).toISOString(),
        sentiment: classification.sentiment,
        confidence: normalizeConfidence(item.score, 0.75),
        impact_days: impactDays,
        expire_at: new Date(now + impactDays * 24 * 60 * 60_000).toISOString(),
        tags: classification.tags,
        status: "active",
        pinned: false,
      };
    });
  } catch {
    recordExternalCall(false);
    return null;
  }
}

/** 从 DeepSeek JSON 响应中安全提取对象。 */
function extractJsonObject(value: string): unknown {
  const withoutFence = value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  try {
    return JSON.parse(withoutFence) as unknown;
  } catch {
    const start = withoutFence.indexOf("{");
    const end = withoutFence.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(withoutFence.slice(start, end + 1)) as unknown;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** 调用 DeepSeek 逐条判定资讯情绪、置信度、影响周期与标签。 */
async function classifyNewsWithDeepSeek(items: NewsItem[], stockName: string): Promise<NewsItem[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "replace-me" || items.length === 0) {
    return items;
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const system = [
    "你是专业的财经资讯分类助手。",
    "只基于给定资讯的标题和摘要进行判断，不要编造额外事实。",
    "只输出 JSON，不要输出 Markdown。",
  ].join("\n");
  const user = [
    `股票名称：${stockName}`,
    "请对每条资讯输出 JSON 对象：",
    '{"items":[{"id":"原文 id","sentiment":"positive|negative|neutral","confidence":0到1的小数,"impact_days":整数,"tags":["短期"或"长期"等]}]}',
    "impact_days 短期通常为 1 到 14 天，长期通常为 30 到 365 天。",
    `资讯：${JSON.stringify(items.map((item) => ({
      id: item.id,
      title: item.title,
      summary: item.summary,
    })))}`,
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.1,
        max_tokens: 3000,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      clearTimeout(timer);
      recordExternalCall(false);
      return items;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    clearTimeout(timer);
    recordExternalCall(true);
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return items;
    }

    const parsed = extractJsonObject(content) as {
      items?: Array<{
        id?: string;
        title?: string;
        sentiment?: unknown;
        confidence?: unknown;
        impact_days?: unknown;
        tags?: unknown;
      }>;
    } | null;
    if (!parsed || !Array.isArray(parsed.items)) {
      return items;
    }

    const byId = new Map<string, (typeof parsed.items)[number]>();
    const byTitle = new Map<string, (typeof parsed.items)[number]>();
    for (const row of parsed.items) {
      if (row.id) {
        byId.set(row.id, row);
      }
      if (row.title) {
        byTitle.set(row.title, row);
      }
    }

    const now = Date.now();
    return items.map((item) => {
      const classification = byId.get(item.id) ?? byTitle.get(item.title);
      if (!classification) {
        return item;
      }

      const tags = normalizeTags(classification.tags);
      const impactDays = normalizeImpactDays(classification.impact_days, tags);
      return {
        ...item,
        sentiment: normalizeSentiment(classification.sentiment),
        confidence: normalizeConfidence(classification.confidence, item.confidence),
        impact_days: impactDays,
        expire_at: new Date(now + impactDays * 24 * 60 * 60_000).toISOString(),
        tags: tags.length > 0 ? tags : impactDays > 14 ? ["长期"] : ["短期"],
      };
    });
  } catch {
    recordExternalCall(false);
    return items;
  }
}

/** 获取资讯；未命中缓存时外部搜索或确定性回退，并写入 store 与 R2 快照。 */
export async function getNews(code: string, forceRefresh = false): Promise<NewsItem[]> {
  const cacheKey = `news:${code}`;
  if (forceRefresh) {
    cacheInvalidatePrefix(cacheKey);
  }

  return cacheGetOrSet(cacheKey, NEWS_TTL_MS, async () => {
    if (!forceRefresh) {
      const saved = await store.newsItems.listByCode(code);
      const now = Date.now();
      const active = saved.filter((item) => {
        if (item.status !== "active" || new Date(item.expire_at).getTime() < now) {
          return false;
        }
        return hasTavilyKey() ? !isDemoNewsItem(item) : true;
      }).map(sanitizeNewsItem);
      if (active.length > 0) {
        return active;
      }
    }

    const stock = await import("@/lib/market-data").then((module) => module.getStock(code));
    const external = await fetchNewsFromTavily(code, stock);
    const fallback = buildDeterministicNews(code, stock);
    const candidate = external && external.length > 0 ? external : fallback;
    const deduped = dedupeNewsItems(candidate);
    const classifiedRaw =
      external && external.length > 0
        ? await classifyNewsWithDeepSeek(deduped, stock.name)
        : deduped;
    const classified = classifiedRaw.map(sanitizeNewsItem);

    let news = classified;
    if (forceRefresh) {
      const saved = await store.newsItems.listByCode(code);
      const now = Date.now();
      const savedCandidates = saved.filter((item) => {
        if (item.status !== "active" || new Date(item.expire_at).getTime() < now) {
          return false;
        }
        return hasTavilyKey() ? !isDemoNewsItem(item) : true;
      }).map(sanitizeNewsItem);
      news = dedupeNewsItems([
        ...classified,
        ...savedCandidates,
      ]);
    }

    for (const item of news) {
      await store.newsItems.insert(item);
    }
    void saveNewsSnapshot(code, news);
    return news;
  });
}

/** 清理到期且未置顶的资讯，返回清理数量。 */
export async function cleanupExpiredNews(now = new Date().toISOString()): Promise<number> {
  const expired = await store.newsItems.listExpired(now);
  for (const item of expired) {
    await store.newsItems.updateStatus(item.id, "expired");
  }
  return expired.length;
}
