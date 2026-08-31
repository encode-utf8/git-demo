// mock 数据：仅用于冻结接口契约，后续分支替换为真实数据源与 store。
import type {
  AnalysisReport,
  Conversation,
  JobRun,
  Kline,
  MarketQuote,
  Message,
  NewsItem,
  Stock,
  TechnicalIndicators,
} from "@/lib/shared/types";

export const mockStock: Stock = {
  code: "600519",
  name: "贵州茅台",
  exchange: "SH",
  industry: "白酒",
  meta: { market: "A股", updated_at: "2026-08-31T00:00:00.000Z" },
};

export const mockQuote: MarketQuote = {
  code: "600519",
  ts: "2026-08-31T07:30:00.000Z",
  price: 1688.0,
  change_pct: 1.25,
  open: 1668.0,
  high: 1692.0,
  low: 1660.0,
  prev_close: 1667.14,
  volume: 3280000,
  amount: 5500000000,
  turnover_rate: 0.26,
  pe: 22.4,
  pb: 8.1,
  market_cap: 2120000000000,
  float_cap: 2120000000000,
  source: "mock",
  fetched_at: "2026-08-31T07:31:00.000Z",
};

export const mockKlines: Kline[] = [
  { code: "600519", period: "day", ts: "2026-08-27T00:00:00.000Z", open: 1660, high: 1680, low: 1655, close: 1667.14, volume: 3100000, amount: 5200000000, adj_type: "qfq" },
  { code: "600519", period: "day", ts: "2026-08-28T00:00:00.000Z", open: 1665, high: 1675, low: 1658, close: 1670.2, volume: 2980000, amount: 5000000000, adj_type: "qfq" },
  { code: "600519", period: "day", ts: "2026-08-29T00:00:00.000Z", open: 1672, high: 1690, low: 1668, close: 1688, volume: 3280000, amount: 5500000000, adj_type: "qfq" },
];

export const mockIndicators: TechnicalIndicators = {
  code: "600519",
  period: "day",
  updated_at: "2026-08-31T07:31:00.000Z",
  ma: { ma5: 1675.11, ma10: 1662.3, ma20: 1648.8, ma60: 1610.5 },
  macd: { dif: 12.4, dea: 10.2, histogram: 2.2 },
  kdj: { k: 66.8, d: 61.2, j: 78.0 },
  rsi: { rsi6: 58.4, rsi12: 55.1, rsi24: 52.6 },
  boll: { upper: 1705.2, middle: 1648.8, lower: 1592.4 },
};

export const mockNews: NewsItem[] = [
  {
    id: "news-001",
    code: "600519",
    title: "贵州茅台发布半年报（mock）",
    summary: "占位摘要，用于冻结资讯接口返回结构。",
    url: "https://example.com/news/600519/001",
    source: "示例财经",
    published_at: "2026-08-30T02:00:00.000Z",
    fetched_at: "2026-08-31T07:00:00.000Z",
    sentiment: "neutral",
    confidence: 0.9,
    impact_days: 30,
    expire_at: "2026-09-30T00:00:00.000Z",
    tags: ["财报"],
    status: "active",
    pinned: false,
  },
];

export const mockReports: AnalysisReport[] = [
  {
    id: "report-001",
    code: "600519",
    created_at: "2026-08-31T07:40:00.000Z",
    data_snapshot: { price: 1688.0 },
    news_refs: ["news-001"],
    content: "占位分析报告，用于冻结报告接口返回结构。",
    risk_note: "仅供学习参考，不构成投资建议。",
  },
];

export const mockConversation: Conversation = {
  id: "conv-001",
  code: "600519",
  title: "贵州茅台盘面讨论",
  created_at: "2026-08-31T08:00:00.000Z",
};

export const mockMessages: Message[] = [
  {
    id: "msg-001",
    conversation_id: "conv-001",
    role: "user",
    content: "帮我看看贵州茅台的盘面。",
    tool_calls: null,
    created_at: "2026-08-31T08:00:01.000Z",
  },
  {
    id: "msg-002",
    conversation_id: "conv-001",
    role: "assistant",
    content: "已为你整理当前行情与指标（mock）。",
    tool_calls: [],
    created_at: "2026-08-31T08:00:03.000Z",
  },
];

export const mockJobRuns: JobRun[] = [
  {
    id: "job-001",
    job_name: "refresh",
    status: "success",
    started_at: "2026-08-31T07:00:00.000Z",
    finished_at: "2026-08-31T07:00:05.000Z",
    detail: { target: "mock" },
  },
];

/** 根据股票代码生成最小 mock 元数据。 */
export function buildMockStock(code: string): Stock {
  return { ...mockStock, code, name: `股票 ${code}` };
}
