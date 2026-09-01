"use client";

import { Button } from "@/components/ui/button";
import { useCallback, useEffect, useState } from "react";
import type {
  AdjustType,
  AnalysisReport,
  Conversation,
  JobRun,
  Kline,
  KlinePeriod,
  MarketQuote,
  Message,
  NewsItem,
  Stock,
  TechnicalIndicators,
} from "@/lib/shared/types";

type ChatViewMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{ title: string; url: string }>;
  riskNote?: string;
  tools?: Array<{ name: string; summary: string }>;
};

interface ObservabilityData {
  metrics: {
    externalCalls: number;
    externalFailures: number;
    cacheHits: number;
    cacheMisses: number;
    analysisRuns: number;
    chatRuns: number;
    cleanupRuns: number;
    lastEventAt: string | null;
    externalFailureRate: number;
    cacheHitRate: number;
  };
  recentJobs: JobRun[];
}

interface ConversationTimeline {
  conversation: Conversation;
  messages: Message[];
}

const DISCLAIMER =
  "本工具仅供学习参考，不构成投资建议。所有行情、资讯与 AI 输出均可能存在延迟或误差，请独立判断并自行承担盈亏。";

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    error?: { message?: string };
  } | null;
  if (!payload?.success || payload.data === undefined) {
    throw new Error(payload?.error?.message ?? "请求失败。");
  }
  return payload.data;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}

function freshnessText(value: string): string {
  const age = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(age) || age < 0) {
    return "时间未知";
  }
  const minutes = Math.floor(age / 60_000);
  if (minutes < 1) {
    return "刚刚";
  }
  if (minutes < 60) {
    return `${minutes} 分钟前`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours} 小时前`;
}

function CandlestickChart({ klines }: { klines: Kline[] }) {
  if (klines.length === 0) {
    return <div className="text-sm text-muted-foreground">暂无 K 线数据。</div>;
  }

  const width = 900;
  const height = 320;
  const volumeHeight = 70;
  const padding = 22;
  const plotHeight = height - padding * 2 - volumeHeight;
  const minPrice = Math.min(...klines.map((item) => item.low));
  const maxPrice = Math.max(...klines.map((item) => item.high));
  const range = maxPrice - minPrice || 1;
  const volumeMax = Math.max(...klines.map((item) => item.volume));
  const slot = (width - padding * 2) / klines.length;
  const candleWidth = Math.max(2, slot * 0.6);

  const yPrice = (price: number) =>
    padding + ((maxPrice - price) / range) * plotHeight;
  const yVolume = (volume: number) =>
    height - padding - (volume / volumeMax) * volumeHeight;

  return (
    <div className="overflow-x-auto rounded-lg border bg-white p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[720px]"
        role="img"
        aria-label="K 线图"
      >
        <line
          x1={padding}
          x2={width - padding}
          y1={height - padding - volumeHeight}
          y2={height - padding - volumeHeight}
          stroke="#e5e7eb"
        />
        {klines.map((item, index) => {
          const center = padding + index * slot + slot / 2;
          const color = item.close >= item.open ? "#ef4444" : "#22c55e";
          const highY = yPrice(item.high);
          const lowY = yPrice(item.low);
          const openY = yPrice(item.open);
          const closeY = yPrice(item.close);
          return (
            <g key={`${item.ts}-${index}`}>
              <line x1={center} x2={center} y1={highY} y2={lowY} stroke={color} />
              <rect
                x={center - candleWidth / 2}
                y={Math.min(openY, closeY)}
                width={candleWidth}
                height={Math.max(Math.abs(closeY - openY), 1)}
                fill={color}
              />
              <rect
                x={center - candleWidth / 2}
                y={yVolume(item.volume)}
                width={candleWidth}
                height={height - padding - yVolume(item.volume)}
                fill={color}
                opacity={0.45}
              />
            </g>
          );
        })}
        <text x={padding} y={height - 4} fontSize="11" fill="#737373">
          {klines[0]?.ts.slice(0, 10)}
        </text>
        <text x={width - 100} y={height - 4} fontSize="11" fill="#737373">
          {klines.at(-1)?.ts.slice(0, 10)}
        </text>
      </svg>
    </div>
  );
}

function CloseLineChart({ klines }: { klines: Kline[] }) {
  if (klines.length < 2) {
    return null;
  }

  const width = 900;
  const height = 220;
  const padding = 22;
  const closes = klines.map((item) => item.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const x = (index: number) =>
    padding + (index / Math.max(closes.length - 1, 1)) * (width - padding * 2);
  const y = (value: number) =>
    padding + ((max - value) / range) * (height - padding * 2);
  const points = closes.map((value, index) => `${x(index)},${y(value)}`).join(" ");

  return (
    <div className="overflow-x-auto rounded-lg border bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]" aria-label="收盘价走势">
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" />
      </svg>
    </div>
  );
}

export default function Home() {  const [input, setInput] = useState("600519");
  const [code, setCode] = useState<string | null>(null);
  const [stock, setStock] = useState<Stock | null>(null);
  const [quote, setQuote] = useState<MarketQuote | null>(null);
  const [klines, setKlines] = useState<Kline[]>([]);
  const [indicators, setIndicators] = useState<TechnicalIndicators | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [reports, setReports] = useState<AnalysisReport[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatViewMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [observability, setObservability] = useState<ObservabilityData | null>(null);
  const [period, setPeriod] = useState<KlinePeriod>("day");
  const [adjust, setAdjust] = useState<AdjustType>("qfq");
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadObservability = useCallback(async () => {
    const data = await apiFetch<ObservabilityData>("/api/admin/observability");
    setObservability(data);
  }, []);

  const loadConversations = useCallback(async (nextCode: string) => {
    try {
      const data = await apiFetch<Conversation[]>(
        `/api/conversations?code=${encodeURIComponent(nextCode)}`,
      );
      setConversations(data);
    } catch {
      setConversations([]);
    }
  }, []);

  const loadChart = useCallback(
    async (nextCode: string, nextPeriod: KlinePeriod, nextAdjust: AdjustType) => {
      setChartLoading(true);
      try {
        const [klineData, indicatorData] = await Promise.all([
          apiFetch<Kline[]>(
            `/api/stocks/${nextCode}/kline?period=${nextPeriod}&adjust=${nextAdjust}&limit=120`,
          ),
          apiFetch<TechnicalIndicators>(
            `/api/stocks/${nextCode}/indicators?period=${nextPeriod}`,
          ),
        ]);
        setKlines(klineData);
        setIndicators(indicatorData);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "盘面数据加载失败。");
      } finally {
        setChartLoading(false);
      }
    },
    [],
  );

  const refreshStock = useCallback(
    async (nextInput: string) => {
      const nextCode = nextInput.trim();
      setLoading(true);
      setError(null);
      try {
        const [stockData, quoteData, newsData, reportsData] = await Promise.all([
          apiFetch<Stock>(`/api/stocks/${encodeURIComponent(nextCode)}`),
          apiFetch<MarketQuote>(`/api/stocks/${encodeURIComponent(nextCode)}/quote`),
          apiFetch<NewsItem[]>(`/api/stocks/${encodeURIComponent(nextCode)}/news`),
          apiFetch<AnalysisReport[]>(`/api/stocks/${encodeURIComponent(nextCode)}/reports`),
        ]);
        setCode(nextCode);
        setStock(stockData);
        setQuote(quoteData);
        setNews(newsData);
        setReports(reportsData);
        setMessages([]);
        setConversationId(undefined);
        setConversations([]);
        await Promise.all([loadConversations(nextCode), loadObservability()]);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "股票查询失败。");
      } finally {
        setLoading(false);
      }
    },
    [loadConversations, loadObservability],
  );

  useEffect(() => {
    const timer = setTimeout(() => void refreshStock("600519"), 0);
    return () => clearTimeout(timer);
  }, [refreshStock]);

  useEffect(() => {
    if (!code) {
      return;
    }
    const timer = setTimeout(() => void loadChart(code, period, adjust), 0);
    return () => clearTimeout(timer);
  }, [code, period, adjust, loadChart]);

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void refreshStock(input);
  };

  const handleAnalysis = async () => {
    if (!code || analysisLoading) {
      return;
    }
    setAnalysisLoading(true);
    try {
      const report = await apiFetch<AnalysisReport>(`/api/stocks/${code}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "请生成当前盘面与资讯分析。" }),
      });
      setReports((previous) => [report, ...previous.filter((item) => item.id !== report.id)]);
      await loadObservability();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "分析生成失败。");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!code) {
      return;
    }
    try {
      await apiFetch<JobRun>("/api/admin/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      await refreshStock(code);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "刷新失败。");
    }
  };

  const handleCleanup = async () => {
    try {
      await apiFetch<JobRun>("/api/admin/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dry_run: false }),
      });
      await loadObservability();
      if (code) {
        setNews(await apiFetch<NewsItem[]>(`/api/stocks/${code}/news`));
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "清理失败。");
    }
  };
  const handleChatSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code || !chatInput.trim() || chatLoading) {
      return;
    }

    const userText = chatInput.trim();
    setChatInput("");
    setChatLoading(true);
    const localUserId = `local-user-${Date.now()}`;
    const assistantId = `local-assistant-${Date.now()}`;
    setMessages((previous) => [
      ...previous,
      { id: localUserId, role: "user", content: userText },
      { id: assistantId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, conversationId, message: userText }),
      });
      if (!response.ok || !response.body) {
        throw new Error("对话接口响应异常。");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handleEvent = (raw: string) => {
        const dataLine = raw.split("\n").find((line) => line.startsWith("data: "));
        if (!dataLine) {
          return;
        }
        const event = JSON.parse(dataLine.slice(6)) as {
          type: string;
          content?: string;
          data?: {
            conversationId?: string;
            messageId?: string;
            message?: string;
            sources?: Array<{ title: string; url: string }>;
            riskNote?: string;
            toolCalls?: Array<{ name: string; summary: string }>;
          };
        };

        if (event.type === "meta" && event.data?.conversationId) {
          setConversationId(event.data.conversationId);
        } else if (event.type === "delta" && event.content) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantId
                ? { ...message, content: message.content + event.content }
                : message,
            ),
          );
        } else if (event.type === "tool" && event.data?.toolCalls) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantId
                ? { ...message, tools: event.data?.toolCalls }
                : message,
            ),
          );
        } else if (event.type === "done" && event.data) {
          setMessages((previous) =>
            previous.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    sources: event.data?.sources,
                    riskNote: event.data?.riskNote,
                  }
                : message,
            ),
          );
        } else if (event.type === "error") {
          throw new Error(event.data?.message ?? "对话生成失败。");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          handleEvent(block);
        }
      }
      if (buffer.trim()) {
        handleEvent(buffer);
      }

      await Promise.all([loadObservability(), loadConversations(code)]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "对话生成失败。");
      setMessages((previous) => previous.filter((message) => message.id !== assistantId));
    } finally {
      setChatLoading(false);
    }
  };

  const loadConversationTimeline = async (id: string) => {
    try {
      const timeline = await apiFetch<ConversationTimeline>(`/api/conversations/${id}`);
      setConversationId(id);
      setMessages(
        timeline.messages.map((message) => ({
          id: message.id,
          role: message.role === "user" ? "user" : "assistant",
          content: message.content,
        })),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "会话加载失败。");
    }
  };

  return (
    <main className="min-h-screen bg-muted/40 px-4 py-8 text-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">个股盘面分析与 AI 学习台</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                输入 6 位沪深北 A 股代码，查看行情、资讯、AI 报告并进行多轮追问。
              </p>
            </div>
            <div className="text-xs text-muted-foreground">
              当前时间：{new Date().toLocaleString("zh-CN", { hour12: false })}
            </div>
          </div>
        </header>

        <form onSubmit={handleSearch} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="例如：600519"
            className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            aria-label="股票代码"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "查询中..." : "查询股票"}
          </Button>
          <Button type="button" variant="outline" onClick={handleRefresh} disabled={!code || loading}>
            强制刷新
          </Button>
          <Button type="button" variant="outline" onClick={handleCleanup}>
            清理到期资讯
          </Button>
        </form>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {stock && quote ? (
          <>
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "最新价", value: quote.price.toFixed(2), note: `${quote.change_pct >= 0 ? "+" : ""}${quote.change_pct.toFixed(2)}%` },
                { label: "今开", value: quote.open.toFixed(2), note: `昨收 ${quote.prev_close.toFixed(2)}` },
                { label: "最高 / 最低", value: `${quote.high.toFixed(2)} / ${quote.low.toFixed(2)}`, note: stock.exchange },
                { label: "成交量额", value: `${(quote.volume / 10000).toFixed(0)} 万手`, note: `${(quote.amount / 100000000).toFixed(1)} 亿元` },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="mt-2 text-2xl font-semibold">{item.value}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
                </div>
              ))}
            </section>

            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold">{stock.name}（{stock.code}）盘面</h2>
                  <p className="text-xs text-muted-foreground">
                    数据时间：{formatDateTime(quote.fetched_at)}（{freshnessText(quote.fetched_at)}），
                    来源：{quote.source}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select
                    value={period}
                    onChange={(event) => setPeriod(event.target.value as KlinePeriod)}
                    className="rounded-md border px-2 py-1.5 text-sm"
                    aria-label="K 线周期"
                  >
                    <option value="minute">分时</option>
                    <option value="day">日 K</option>
                    <option value="week">周 K</option>
                    <option value="month">月 K</option>
                  </select>
                  <select
                    value={adjust}
                    onChange={(event) => setAdjust(event.target.value as AdjustType)}
                    className="rounded-md border px-2 py-1.5 text-sm"
                    aria-label="复权方式"
                  >
                    <option value="qfq">前复权</option>
                    <option value="hfq">后复权</option>
                    <option value="none">不复权</option>
                  </select>
                </div>
              </div>
              {chartLoading ? (
                <div className="py-16 text-center text-sm text-muted-foreground">图表加载中...</div>
              ) : (
                <CandlestickChart klines={klines} />
              )}
            </section>
            {indicators ? (
              <section className="rounded-xl border bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">技术指标</h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  本地计算，更新时间 {formatDateTime(indicators.updated_at)}
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>MA5：{indicators.ma.ma5?.toFixed(2) ?? "暂无"}</div>
                    <div>MA10：{indicators.ma.ma10?.toFixed(2) ?? "暂无"}</div>
                    <div>MA20：{indicators.ma.ma20?.toFixed(2) ?? "暂无"}</div>
                    <div>MA60：{indicators.ma.ma60?.toFixed(2) ?? "暂无"}</div>
                    <div>MACD DIF：{indicators.macd.dif?.toFixed(2) ?? "暂无"}</div>
                    <div>MACD DEA：{indicators.macd.dea?.toFixed(2) ?? "暂无"}</div>
                    <div>KDJ：{indicators.kdj.k?.toFixed(1) ?? "-"} / {indicators.kdj.d?.toFixed(1) ?? "-"} / {indicators.kdj.j?.toFixed(1) ?? "-"}</div>
                    <div>RSI6：{indicators.rsi.rsi6?.toFixed(1) ?? "暂无"}</div>
                    <div>RSI12：{indicators.rsi.rsi12?.toFixed(1) ?? "暂无"}</div>
                    <div>RSI24：{indicators.rsi.rsi24?.toFixed(1) ?? "暂无"}</div>
                    <div>BOLL 上轨：{indicators.boll.upper?.toFixed(2) ?? "暂无"}</div>
                    <div>BOLL 下轨：{indicators.boll.lower?.toFixed(2) ?? "暂无"}</div>
                  </div>
                  <CloseLineChart klines={klines} />
                </div>
              </section>
            ) : null}

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">资讯与影响周期</h2>
                  <Button type="button" variant="outline" size="sm" onClick={handleAnalysis} disabled={analysisLoading}>
                    {analysisLoading ? "生成中..." : "生成 AI 分析"}
                  </Button>
                </div>
                <div className="space-y-3">
                  {news.map((item) => (
                    <div key={item.id} className="rounded-lg border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                          {item.title}
                        </a>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.sentiment === "positive" ? "利好" : item.sentiment === "negative" ? "利空" : "中性"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>来源：{item.source}</span>
                        <span>影响 {item.impact_days} 天</span>
                        <span>到期 {formatDateTime(item.expire_at)}</span>
                        <span>置信度 {(item.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">历史分析时间线</h2>
                <div className="mt-3 space-y-4">
                  {reports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无历史报告，点击“生成 AI 分析”开始。</p>
                  ) : (
                    reports.map((report) => (
                      <div key={report.id} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">{formatDateTime(report.created_at)}</span>
                          <span className="text-xs text-muted-foreground">{report.news_refs.length} 条引用</span>
                        </div>
                        <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
                          {report.content}
                        </pre>
                        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          {report.risk_note}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold">对话助手</h2>
                <span className="text-xs text-muted-foreground">
                  {conversationId ? `会话 ${conversationId.slice(0, 12)}...` : "新会话"}
                </span>
              </div>
              <div className="mb-4 max-h-[420px] space-y-3 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                {messages.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">
                    可以追问“当前支撑位怎么看”或“这条政策逻辑是什么”。
                  </p>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`max-w-[85%] rounded-lg border px-3 py-2 text-sm ${
                        message.role === "user"
                          ? "ml-auto bg-primary text-primary-foreground"
                          : "bg-white"
                      }`}
                    >
                      {message.content ? (
                        <pre className="whitespace-pre-wrap break-words font-sans leading-6">
                          {message.content}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground">思考中...</span>
                      )}
                      {message.tools?.length ? (
                        <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                          工具：{message.tools.map((tool) => tool.name).join("、")}
                        </div>
                      ) : null}
                      {message.sources?.length ? (
                        <div className="mt-2 border-t pt-2 text-xs text-muted-foreground">
                          来源：
                          {message.sources.map((source, index) => (
                            <a
                              key={`${source.url}-${index}`}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer"
                              className="mr-2 text-primary hover:underline"
                            >
                              {source.title}
                            </a>
                          ))}
                        </div>
                      ) : null}
                      {message.riskNote ? (
                        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                          {message.riskNote}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
              <form onSubmit={handleChatSubmit} className="flex gap-2">
                <input
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  placeholder="围绕当前股票继续追问..."
                  className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                  disabled={!code || chatLoading}
                />
                <Button type="submit" disabled={!code || chatLoading || !chatInput.trim()}>
                  {chatLoading ? "回复中..." : "发送"}
                </Button>
              </form>
            </section>

            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">对话时间线回看</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {conversations.length === 0 ? (
                  <span className="text-sm text-muted-foreground">暂无历史会话。</span>
                ) : (
                  conversations.map((conversation) => (
                    <Button
                      key={conversation.id}
                      type="button"
                      variant={conversation.id === conversationId ? "default" : "outline"}
                      size="sm"
                      onClick={() => void loadConversationTimeline(conversation.id)}
                    >
                      {conversation.title} · {formatDateTime(conversation.created_at)}
                    </Button>
                  ))
                )}
              </div>
            </section>
          </>
        ) : null}

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">可观测性</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => void loadObservability()}>
              刷新指标
            </Button>
          </div>
          {observability ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">外部调用次数</div>
                  <div className="mt-1 text-xl font-semibold">{observability.metrics.externalCalls}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">外部失败率</div>
                  <div className="mt-1 text-xl font-semibold">{observability.metrics.externalFailureRate}%</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">缓存复用命中率</div>
                  <div className="mt-1 text-xl font-semibold">{observability.metrics.cacheHitRate}%</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="text-xs text-muted-foreground">分析 / 对话 / 清理</div>
                  <div className="mt-1 text-xl font-semibold">
                    {observability.metrics.analysisRuns} / {observability.metrics.chatRuns} / {observability.metrics.cleanupRuns}
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                最近任务：
                {observability.recentJobs.length === 0
                  ? "暂无"
                  : observability.recentJobs.slice(0, 5).map((job) => (
                      <span key={job.id} className="ml-2">
                        {job.job_name}（{job.status}）{job.finished_at ? formatDateTime(job.finished_at) : "运行中"}
                      </span>
                    ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">可观测性指标加载中...</p>
          )}
        </section>

        <footer className="rounded-xl border bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
          {DISCLAIMER}
          <span className="ml-2 text-amber-700">
            数据更新：{quote ? formatDateTime(quote.fetched_at) : "尚未查询"}
          </span>
        </footer>
      </div>
    </main>
  );
}
