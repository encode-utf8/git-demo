import { store } from "@/lib/store";
import type {
  AnalysisReport,
  Conversation,
  Message,
  NewsItem,
  ReplaySummary,
} from "@/lib/shared/types";

/** 复盘时间线中的分析事件。 */
export interface ReplayAnalysisEvent {
  type: "analysis";
  id: string;
  code: string;
  occurred_at: string;
  report: AnalysisReport;
}

/** 复盘时间线中的对话事件。 */
export interface ReplayConversationEvent {
  type: "conversation";
  id: string;
  code: string;
  occurred_at: string;
  conversation: Conversation;
  messages: Message[];
}

/** 复盘时间线事件联合类型。 */
export type ReplayTimelineEvent = ReplayAnalysisEvent | ReplayConversationEvent;

/** 复盘时间线返回结构。 */
export interface ReplayTimeline {
  code: string;
  period_start: string;
  period_end: string;
  generated_at: string;
  events: ReplayTimelineEvent[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** 将 days 参数规范化为 1-365 的整数。 */
export function normalizeReplayDays(raw: string | null, fallback = 30): number {
  const parsed = Number(raw ?? fallback);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(Math.floor(parsed), 1), 365);
}

/** 构造最近 N 天的复盘窗口。 */
export function getReplayWindow(days: number, now = new Date()): {
  period_start: string;
  period_end: string;
} {
  const endMs = now.getTime();
  return {
    period_start: new Date(endMs - days * DAY_MS).toISOString(),
    period_end: now.toISOString(),
  };
}

function isInWindow(value: string, startMs: number, endMs: number): boolean {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= startMs && timestamp <= endMs;
}

/** 从报告快照中安全读取当期涨跌幅。 */
function readSnapshotChangePct(report: AnalysisReport): number | null {
  const snapshot = report.data_snapshot as
    | { quote?: { change_pct?: unknown } }
    | null
    | undefined;
  const raw = snapshot?.quote?.change_pct;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/**
 * 计算命中率：以“资讯方向与后续分析报告快照中的当期涨跌方向是否一致”为口径。
 * 仅统计可匹配到后续报告的利好/利空资讯，中性资讯不计入方向命中样本。
 */
function calculateHitRate(news: NewsItem[], reports: AnalysisReport[]): {
  sample_size: number;
  hit_rate: number;
} {
  let sampleSize = 0;
  let directionalHits = 0;

  for (const item of news) {
    if (item.sentiment !== "positive" && item.sentiment !== "negative") {
      continue;
    }

    const nextReport = reports
      .filter((report) => {
        const reportTime = new Date(report.created_at).getTime();
        const newsTime = new Date(item.published_at).getTime();
        return report.news_refs.includes(item.id) && reportTime >= newsTime;
      })
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0];

    if (!nextReport) {
      continue;
    }

    const changePct = readSnapshotChangePct(nextReport);
    if (changePct === null) {
      continue;
    }

    sampleSize += 1;
    const matched =
      item.sentiment === "positive" ? changePct > 0 : changePct < 0;
    if (matched) {
      directionalHits += 1;
    }
  }

  return {
    sample_size: sampleSize,
    hit_rate: sampleSize > 0 ? directionalHits / sampleSize : 0,
  };
}

/** 汇总某股票在时间窗口内的复盘统计。 */
export async function getReplaySummary(
  code: string,
  days: number,
  now = new Date(),
): Promise<ReplaySummary> {
  const { period_start, period_end } = getReplayWindow(days, now);
  const [reports, conversations, news] = await Promise.all([
    store.analysisReports.listByCode(code),
    store.conversations.listByCode(code),
    store.newsItems.listByCode(code),
  ]);

  const startMs = new Date(period_start).getTime();
  const endMs = new Date(period_end).getTime();
  const reportsInWindow = reports.filter((item) =>
    isInWindow(item.created_at, startMs, endMs),
  );
  const conversationsInWindow = conversations.filter((item) =>
    isInWindow(item.created_at, startMs, endMs),
  );
  const newsInWindow = news.filter((item) =>
    isInWindow(item.published_at, startMs, endMs),
  );

  const { sample_size, hit_rate } = calculateHitRate(newsInWindow, reportsInWindow);

  return {
    code,
    period_start,
    period_end,
    total_analysis: reportsInWindow.length,
    total_chats: conversationsInWindow.length,
    positive_hits: newsInWindow.filter((item) => item.sentiment === "positive").length,
    negative_hits: newsInWindow.filter((item) => item.sentiment === "negative").length,
    neutral_hits: newsInWindow.filter((item) => item.sentiment === "neutral").length,
    hit_rate,
    sample_size,
    generated_at: now.toISOString(),
  };
}

/** 获取某股票在时间窗口内的分析与对话时间线。 */
export async function getReplayTimeline(
  code: string,
  days: number,
  now = new Date(),
): Promise<ReplayTimeline> {
  const { period_start, period_end } = getReplayWindow(days, now);
  const [reports, conversations] = await Promise.all([
    store.analysisReports.listByCode(code),
    store.conversations.listByCode(code),
  ]);

  const startMs = new Date(period_start).getTime();
  const endMs = new Date(period_end).getTime();
  const reportsInWindow = reports.filter((item) =>
    isInWindow(item.created_at, startMs, endMs),
  );
  const conversationsInWindow = conversations.filter((item) =>
    isInWindow(item.created_at, startMs, endMs),
  );

  const conversationEvents: ReplayConversationEvent[] = await Promise.all(
    conversationsInWindow.map(async (conversation) => {
      const messages = await store.messages.listByConversation(conversation.id);
      return {
        type: "conversation",
        id: conversation.id,
        code: conversation.code,
        occurred_at: conversation.created_at,
        conversation,
        messages: messages.filter((message) =>
          isInWindow(message.created_at, startMs, endMs),
        ),
      };
    }),
  );

  const analysisEvents: ReplayAnalysisEvent[] = reportsInWindow.map((report) => ({
    type: "analysis",
    id: report.id,
    code: report.code,
    occurred_at: report.created_at,
    report,
  }));

  const events: ReplayTimelineEvent[] = [...analysisEvents, ...conversationEvents].sort(
    (a, b) => b.occurred_at.localeCompare(a.occurred_at),
  );

  return {
    code,
    period_start,
    period_end,
    generated_at: now.toISOString(),
    events,
  };
}
