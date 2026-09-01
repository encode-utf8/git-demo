// 对话助手编排：多轮上下文 + 工具调用数据整理 + 风险护栏。
import { runAnalysis } from "@/lib/analysis";
import { getIndicators, getKlines, getMarketQuote, getStock } from "@/lib/market-data";
import { getNews } from "@/lib/news";
import { store } from "@/lib/store";
import type {
  AnalysisReport,
  Conversation,
  Kline,
  MarketQuote,
  Message,
  NewsItem,
  TechnicalIndicators,
} from "@/lib/shared/types";

/** 对话请求结构。 */
export interface ChatRequest {
  code: string;
  conversationId?: string;
  message: string;
}

/** 对话回复结构，供 SSE 流式路由使用。 */
export interface ChatReply {
  conversationId: string;
  messageId: string;
  content: string;
  sources: Array<{ title: string; url: string }>;
  riskNote: string;
  toolCalls: Array<{ name: string; summary: string }>;
}

const RISK_NOTE =
  "以上内容仅供学习参考，不构成投资建议；市场存在不确定性，请独立决策并自行承担盈亏。";

/** 生成短 id。 */
function shortId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** 获取或创建会话。 */
async function resolveConversation(code: string, conversationId?: string): Promise<Conversation> {
  if (conversationId) {
    const existing = await store.conversations.getById(conversationId);
    if (existing) {
      return existing;
    }
  }

  const conversation: Conversation = {
    id: shortId("conv"),
    code,
    title: `${code} 盘面讨论`,
    created_at: new Date().toISOString(),
  };
  await store.conversations.create(conversation);
  return conversation;
}

/** 将历史消息整理为上下文文本。 */
function buildHistoryText(messages: Message[]): string {
  return messages
    .slice(-8)
    .map((item) => `${item.role === "user" ? "用户" : "助手"}：${item.content}`)
    .join("\n");
}

/** 基于上下文生成确定性助手回答。 */
function buildAssistantAnswer(
  userText: string,
  stockName: string,
  quote: MarketQuote,
  indicators: TechnicalIndicators,
  klines: Kline[],
  news: NewsItem[],
  latestReport: AnalysisReport | null,
  historyText: string,
): string {
  const price = quote.price.toFixed(2);
  const changePct = quote.change_pct.toFixed(2);
  const ma5 = indicators.ma.ma5?.toFixed(2) ?? "暂无";
  const rsi6 = indicators.rsi.rsi6?.toFixed(1) ?? "暂无";
  const latestKline = klines.at(-1);
  const latestKlineText = latestKline
    ? `最近 K 线收于 ${latestKline.close.toFixed(2)}，时间 ${latestKline.ts.slice(0, 10)}。`
    : "暂无 K 线数据。";
  const positiveCount = news.filter((item) => item.sentiment === "positive").length;
  const negativeCount = news.filter((item) => item.sentiment === "negative").length;
  const neutralCount = news.filter((item) => item.sentiment === "neutral").length;

  const reportText = latestReport
    ? `我已读取最近报告（${new Date(latestReport.created_at).toLocaleString("zh-CN")}）：${latestReport.content.slice(0, 240)}……`
    : "当前还没有历史报告，可点击“生成分析报告”后继续追问。";

  const answer = [
    `你问的是「${userText}」。我已结合 ${stockName} 的最新行情、资讯和历史上下文进行整理。`,
    "",
    "### 当前数据",
    `- 最新价：${price}，涨跌幅 ${changePct}%。`,
    `- MA5：${ma5}，RSI6：${rsi6}。`,
    `- ${latestKlineText}`,
    `- 资讯共 ${news.length} 条：利好 ${positiveCount}、利空 ${negativeCount}、中性 ${neutralCount}。`,
    `- 行情更新时间：${new Date(quote.fetched_at).toLocaleString("zh-CN")}，来源：${quote.source}。`,
    "",
    "### 与之前对话的关联",
    historyText
      ? "上一轮上下文已纳入本次回答，下面基于延续问题继续解释。"
      : "这是本轮会话的首个问题，后续追问会继续复用当前股票上下文。",
    "",
    "### 解释",
    "从学习角度，先看趋势与量价是否一致，再看消息面能否解释盘面变化，最后核对风险是否可承受。",
    "短线波动无法被稳定预测，分析的目标是提高决策质量，而不是给出确定性方向。",
    "",
    reportText,
    "",
    "### 风险提示",
    RISK_NOTE,
  ].join("\n");

  return answer;
}

/** 执行对话，返回上下文、回答、来源与工具调用记录。 */
export async function runChat(request: ChatRequest): Promise<{
  conversationId: string;
  userMessage: Message;
  assistantMessage: Message;
  reply: ChatReply;
}> {
  const conversation = await resolveConversation(request.code, request.conversationId);
  const history = await store.messages.listByConversation(conversation.id);

  const userMessage: Message = {
    id: shortId("msg"),
    conversation_id: conversation.id,
    role: "user",
    content: request.message,
    tool_calls: null,
    created_at: new Date().toISOString(),
  };
  await store.messages.insert(userMessage);

  const [stock, quote, indicators, klines, news, reports] = await Promise.all([
    getStock(request.code),
    getMarketQuote(request.code),
    getIndicators(request.code, "day"),
    getKlines(request.code, "day", "qfq", 60),
    getNews(request.code),
    store.analysisReports.listByCode(request.code),
  ]);

  const toolCalls: ChatReply["toolCalls"] = [
    { name: "get_quote", summary: `${stock.name} 最新价 ${quote.price.toFixed(2)}` },
    { name: "get_kline", summary: `读取 ${klines.length} 条日 K` },
    { name: "get_indicators", summary: "读取 MA/MACD/KDJ/RSI/BOLL 指标" },
    { name: "search_news", summary: `读取 ${news.length} 条资讯` },
    { name: "get_report", summary: reports.length > 0 ? "已读取历史报告" : "暂无历史报告" },
  ];

  let saveReportSummary = "未触发保存报告";
  if (/保存报告|生成报告|再分析|分析一下/.test(request.message)) {
    const report = await runAnalysis(request.code, request.message);
    saveReportSummary = `已生成并保存报告 ${report.id}`;
    toolCalls.push({ name: "save_report", summary: saveReportSummary });
  }

  const historyText = buildHistoryText(history);
  const latestReport = reports.at(0) ?? null;
  const content = buildAssistantAnswer(
    request.message,
    stock.name,
    quote,
    indicators,
    klines,
    news,
    latestReport,
    historyText,
  );

  const assistantMessage: Message = {
    id: shortId("msg"),
    conversation_id: conversation.id,
    role: "assistant",
    content,
    tool_calls: toolCalls.map((tool) => ({ name: tool.name, summary: tool.summary })),
    created_at: new Date().toISOString(),
  };
  await store.messages.insert(assistantMessage);

  const sources = news.slice(0, 5).map((item) => ({
    title: item.title,
    url: item.url,
  }));

  return {
    conversationId: conversation.id,
    userMessage,
    assistantMessage,
    reply: {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      content,
      sources,
      riskNote: RISK_NOTE,
      toolCalls,
    },
  };
}

/** 获取会话及消息时间线。 */
export async function getConversationTimeline(conversationId: string): Promise<{
  conversation: Conversation;
  messages: Message[];
} | null> {
  const conversation = await store.conversations.getById(conversationId);
  if (!conversation) {
    return null;
  }
  const messages = await store.messages.listByConversation(conversationId);
  return { conversation, messages };
}

/** 获取某股票全部会话（供时间线列表）。 */
export async function listConversations(code: string): Promise<Conversation[]> {
  return store.conversations.listByCode(code);
}
