// 资讯读取与外部搜索封装：Tavily 可用时调用，否则确定性回退并落库。
import { cacheGetOrSet, cacheInvalidatePrefix } from "@/lib/cache";
import { recordExternalCall } from "@/lib/observability";
import { store } from "@/lib/store";
import type { NewsItem, NewsSentiment, Stock } from "@/lib/shared/types";

const NEWS_TTL_MS = 5 * 60_000;

/** 生成短哈希，用于资讯去重标识。 */
function shortHash(input: string): string {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

/** 根据关键词给出简单情绪与影响周期。 */
function classifyTitle(title: string): {
  sentiment: NewsSentiment;
  impactDays: number;
  tags: string[];
} {
  const text = title;
  const positive = /增长|预增|突破|中标|回购|签约|提升|利好|扭亏|创新高/.test(text);
  const negative = /下滑|预亏|处罚|立案|减持|诉讼|风险|亏损|停产|下调/.test(text);
  const longTerm = /政策|行业|规划|战略|财报|年报|半年报|并购|重组/.test(text);

  return {
    sentiment: positive && !negative ? "positive" : negative && !positive ? "negative" : "neutral",
    impactDays: longTerm ? 30 : 7,
    tags: longTerm ? ["长期", "重点观察"] : ["短期"],
  };
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
      id: `news-${code}-${shortHash(item.title)}-${index}`,
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

/** 调用 Tavily 搜索；未配置密钥时不发起调用。 */
async function fetchNewsFromTavily(code: string, stock: Stock): Promise<NewsItem[] | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || apiKey === "replace-me") {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4_000);
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query: `${stock.name} ${code} 公告 业绩 行业 风险`,
        max_results: 6,
        search_depth: "basic",
        include_answer: false,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      recordExternalCall(false);
      return null;
    }

    const payload = (await response.json()) as {
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
        published_date?: string;
      }>;
    };
    recordExternalCall(true);
    const now = Date.now();
    const results = payload.results ?? [];
    if (results.length === 0) {
      return [];
    }

    return results.slice(0, 6).map((item, index) => {
      const title = item.title ?? `${stock.name}相关资讯 ${index + 1}`;
      const classification = classifyTitle(title);
      const impactDays = classification.impactDays;
      const publishedAt = item.published_date
        ? new Date(item.published_date).toISOString()
        : new Date(now - index * 2 * 60 * 60_000).toISOString();
      return {
        id: `news-${code}-${shortHash(item.url ?? title)}-${index}`,
        code,
        title,
        summary: item.content ?? "未获取到正文摘要。",
        url: item.url ?? `https://example.com/news/${code}/${index + 1}`,
        source: "Tavily",
        published_at: publishedAt,
        fetched_at: new Date(now).toISOString(),
        sentiment: classification.sentiment,
        confidence: item.score ? Math.max(0, Math.min(1, item.score)) : 0.75,
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

/** 获取资讯；未命中时外部搜索或确定性回退并写入 store。 */
export async function getNews(code: string, forceRefresh = false): Promise<NewsItem[]> {
  const cacheKey = `news:${code}`;
  if (forceRefresh) {
    cacheInvalidatePrefix(cacheKey);
  }

  return cacheGetOrSet(cacheKey, NEWS_TTL_MS, async () => {
    if (!forceRefresh) {
      const saved = await store.newsItems.listByCode(code);
      if (saved.some((item) => item.status === "active")) {
        return saved;
      }
    }

    const stock = await import("@/lib/market-data").then((module) => module.getStock(code));
    const external = await fetchNewsFromTavily(code, stock);
    const news = external && external.length > 0 ? external : buildDeterministicNews(code, stock);

    for (const item of news) {
      await store.newsItems.insert(item);
    }
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
