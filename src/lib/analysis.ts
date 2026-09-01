// AI 分析编排：读取行情/指标/资讯后生成教学式报告，并持久化。
import { recordExternalCall, recordTaskRun } from "@/lib/observability";
import { getIndicators, getKlines, getMarketQuote, getStock } from "@/lib/market-data";
import { getNews } from "@/lib/news";
import { saveAnalysisSnapshot } from "@/lib/r2";
import { store } from "@/lib/store";
import type {
  AnalysisReport,
  MarketQuote,
  NewsItem,
  TechnicalIndicators,
} from "@/lib/shared/types";

/** 生成稳定的报告编号。 */
function buildReportId(code: string): string {
  return `report-${code}-${Date.now()}`;
}

/** 判断文本是否包含确定性收益承诺；报告生成器必须避免这些表达。 */
function hasForbiddenPromise(text: string): boolean {
  return /必然(上涨|下跌|涨|跌)|一定(涨|跌)|稳赚|保本|包赚/.test(text);
}

/** 构建本地确定性报告正文。 */
function buildFallbackReport(
  code: string,
  stockName: string,
  quote: MarketQuote,
  indicators: TechnicalIndicators,
  news: NewsItem[],
): string {
  const price = quote.price.toFixed(2);
  const change = quote.change_pct.toFixed(2);
  const positiveCount = news.filter((item) => item.sentiment === "positive").length;
  const negativeCount = news.filter((item) => item.sentiment === "negative").length;
  const neutralCount = news.filter((item) => item.sentiment === "neutral").length;
  const ma5 = indicators.ma.ma5?.toFixed(2) ?? "暂无";
  const ma20 = indicators.ma.ma20?.toFixed(2) ?? "暂无";
  const rsi6 = indicators.rsi.rsi6?.toFixed(1) ?? "暂无";

  return [
    `## ${stockName}（${code}）分析`,
    "",
    "### 数据面",
    `- 最新价：${price}，当日涨跌幅 ${change}%。`,
    `- 当前行情来源：${quote.source}，数据获取时间：${new Date(quote.fetched_at).toLocaleString("zh-CN")}。`,
    `- MA5：${ma5}，MA20：${ma20}，RSI6：${rsi6}。`,
    "指标只用于观察价格趋势与强弱，不等同于买卖信号。",
    "",
    "### 消息面",
    `- 共梳理 ${news.length} 条资讯：利好 ${positiveCount} 条、利空 ${negativeCount} 条、中性 ${neutralCount} 条。`,
    "- 每条资讯均带来源与影响周期；短期信息默认观察 7 天，长期信息观察 30 天。",
    "",
    "### 情绪面",
    "- 当前多空信息交织，应结合成交量与价格位置观察市场是否形成一致性预期。",
    "- 情绪面只能作为辅助，不能替代基本面与风险承受能力评估。",
    "",
    "### 教学讲解",
    "看盘时先看趋势，再看量价配合，最后回到公司基本面和消息验证。价格短期的随机波动很高，",
    "关键不是预测每一次涨跌，而是识别驱动因素、风险点与自己能承受的边界。",
    "",
    "### 风险提示",
    "- 本报告不构成任何投资建议，不构成必然上涨或下跌的预测。",
    "- 所有结论仅供学习参考，用户需独立决策并自行承担盈亏。",
  ].join("\n");
}

/** 调用 DeepSeek 生成分析正文；未配置密钥时返回 null。 */
async function generateWithDeepSeek(
  prompt: string,
  quote: MarketQuote,
  indicators: TechnicalIndicators,
  news: NewsItem[],
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey || apiKey === "replace-me") {
    return null;
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
  const system = [
    "你是职业投资者视角的教学式分析助手。",
    "必须基于给定数据，必须引用来源，必须给出风险提示。",
    "禁止输出“必然涨/必然跌/稳赚/包赚”等确定性收益承诺。",
    "使用中文 Markdown 输出。",
  ].join("\n");
  const user = [
    "请根据以下数据生成分析报告：",
    `行情：${JSON.stringify(quote)}`,
    `指标：${JSON.stringify(indicators)}`,
    `资讯：${JSON.stringify(news.map((item) => ({ title: item.title, source: item.source, sentiment: item.sentiment, impact_days: item.impact_days, url: item.url })))}`,
    `用户补充：${prompt || "无"}`,
  ].join("\n");

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
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
        temperature: 0.4,
        max_tokens: 1200,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      recordExternalCall(false);
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    recordExternalCall(true);
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content || hasForbiddenPromise(content)) {
      return null;
    }
    return content;
  } catch {
    recordExternalCall(false);
    return null;
  }
}

/** 触发一次 AI 分析，返回持久化后的报告。 */
export async function runAnalysis(
  code: string,
  prompt?: string,
): Promise<AnalysisReport> {
  recordTaskRun("analysis");

  const [stock, quote, indicators, klines, news] = await Promise.all([
    getStock(code),
    getMarketQuote(code),
    getIndicators(code, "day"),
    getKlines(code, "day", "qfq", 120),
    getNews(code),
  ]);

  const fallbackContent = buildFallbackReport(code, stock.name, quote, indicators, news);
  const llmContent = await generateWithDeepSeek(
    prompt ?? "",
    quote,
    indicators,
    news,
  );
  const content = llmContent ?? fallbackContent;
  const riskNote = [
    "本报告仅供学习参考，不构成任何投资建议。",
    "市场存在不确定性，请勿将任何分析结论理解为必然上涨或下跌的承诺。",
    "数据可能存在延迟或缺失，用户应独立核验并自行承担决策风险。",
  ].join(" ");

  const report: AnalysisReport = {
    id: buildReportId(code),
    code,
    created_at: new Date().toISOString(),
    data_snapshot: {
      quote,
      indicators,
      kline_count: klines.length,
      news_count: news.length,
    },
    news_refs: news.map((item) => item.id),
    content,
    risk_note: riskNote,
  };

  const r2Key = await saveAnalysisSnapshot(report);
  const persistedReport = r2Key
    ? { ...report, data_snapshot: { ...report.data_snapshot, r2_key: r2Key } }
    : report;
  await store.analysisReports.insert(persistedReport);
  return persistedReport;
}

/** 获取历史报告时间线。 */
export async function listReports(code: string): Promise<AnalysisReport[]> {
  return store.analysisReports.listByCode(code);
}
