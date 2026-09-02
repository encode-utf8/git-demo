"use client";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { ReplaySummary } from "@/lib/shared/types";
import type { ReplayTimeline, ReplayTimelineEvent } from "@/lib/replay";

/** 最近 N 天可选项。 */
const DAY_OPTIONS = [7, 30, 90] as const;

/** 复盘接口统一返回包装。 */
interface ReplayApiPayload<T> {
  success?: boolean;
  data?: T;
  error?: { message?: string };
}

async function apiFetch<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const payload = (await response.json().catch(() => null)) as ReplayApiPayload<T> | null;
  if (!payload?.success || payload.data === undefined) {
    throw new Error(payload?.error?.message ?? "请求失败。");
  }
  return payload.data;
}

function formatHitRate(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function TimelineEventCard({ event }: { event: ReplayTimelineEvent }) {
  if (event.type === "analysis") {
    const report = event.report;
    return (
      <div className="rounded-lg border p-3">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            AI 分析
          </span>
          <span className="font-medium">{formatDateTime(event.occurred_at)}</span>
          <span className="text-xs text-muted-foreground">
            引用 {report.news_refs.length} 条资讯
          </span>
        </div>
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded bg-muted/20 p-3 font-sans text-sm leading-6 text-foreground">
          {report.content}
        </pre>
        {report.risk_note ? (
          <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {report.risk_note}
          </p>
        ) : null}
      </div>
    );
  }

  const roleLabel: Record<string, string> = {
    user: "用户",
    assistant: "助手",
    system: "系统",
  };

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          对话
        </span>
        <span className="font-medium">{formatDateTime(event.occurred_at)}</span>
        <span className="text-xs text-muted-foreground">{event.conversation.title}</span>
      </div>
      <div className="space-y-2">
        {event.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">该时间段内暂无消息。</p>
        ) : (
          event.messages.map((message) => (
            <div
              key={message.id}
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.role === "user" ? "bg-muted/40" : "bg-white"
              }`}
            >
              <span className="mr-2 text-xs font-medium text-muted-foreground">
                {roleLabel[message.role] ?? message.role}
              </span>
              <pre className="whitespace-pre-wrap break-words font-sans leading-6">
                {message.content || "无内容"}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface ReplayPanelProps {
  code: string | null;
}

/** 历史复盘与命中率统计面板，仅用于学习，不承诺任何收益。 */
export function ReplayPanel({ code }: ReplayPanelProps) {
  const [codeInput, setCodeInput] = useState(code ?? "600519");
  const [queryCode, setQueryCode] = useState(code ?? "600519");
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<ReplaySummary | null>(null);
  const [timeline, setTimeline] = useState<ReplayTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReplay = useCallback(
    async (code: string, nextDays: number, isActive: () => boolean) => {
      try {
        const [statsData, timelineData] = await Promise.all([
          apiFetch<ReplaySummary>(
            `/api/replay/stats?code=${encodeURIComponent(code)}&days=${nextDays}`,
          ),
          apiFetch<ReplayTimeline>(
            `/api/replay/timeline?code=${encodeURIComponent(code)}&days=${nextDays}`,
          ),
        ]);
        if (!isActive()) {
          return;
        }
        setStats(statsData);
        setTimeline(timelineData);
      } catch (nextError) {
        if (!isActive()) {
          return;
        }
        setStats(null);
        setTimeline(null);
        setError(nextError instanceof Error ? nextError.message : "复盘数据加载失败。");
      } finally {
        if (isActive()) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void loadReplay(queryCode, days, () => active);
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [loadReplay, queryCode, days]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextCode = codeInput.trim();
    if (!/^\d{6}$/.test(nextCode)) {
      setError("请输入 6 位沪深北 A 股代码。");
      return;
    }
    setLoading(true);
    setError(null);
    setQueryCode(nextCode);
  }

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">历史复盘与命中率统计</h2>
          <p className="text-xs text-muted-foreground">仅用于学习，不构成投资建议，不承诺收益。</p>
        </div>
        <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
          仅供学习
        </span>
      </div>

      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2">
        <input
          value={codeInput}
          onChange={(event) => setCodeInput(event.target.value)}
          placeholder="输入 6 位股票代码"
          className="w-40 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        />
        <select
          value={days}
          onChange={(event) => {
            setLoading(true);
            setError(null);
            setDays(Number(event.target.value));
          }}
          className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          {DAY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              最近 {option} 天
            </option>
          ))}
        </select>
        <Button type="submit" disabled={loading}>
          {loading ? "加载中..." : "查询复盘"}
        </Button>
      </form>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {stats ? (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">分析次数</p>
              <p className="mt-1 text-2xl font-semibold">{stats.total_analysis}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">对话次数</p>
              <p className="mt-1 text-2xl font-semibold">{stats.total_chats}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">利好资讯</p>
              <p className="mt-1 text-2xl font-semibold text-green-700">{stats.positive_hits}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">利空资讯</p>
              <p className="mt-1 text-2xl font-semibold text-red-700">{stats.negative_hits}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">中性资讯</p>
              <p className="mt-1 text-2xl font-semibold">{stats.neutral_hits}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">命中率 / 样本量</p>
              <p className="mt-1 text-2xl font-semibold">
                {formatHitRate(stats.hit_rate)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  / {stats.sample_size}
                </span>
              </p>
            </div>
          </div>

          <div className="mb-4 space-y-1 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            <p>
              统计范围：{formatDateTime(stats.period_start)} 至 {formatDateTime(stats.period_end)}
            </p>
            <p>分析次数 = 时间段内创建的分析报告数；对话次数 = 时间段内创建的会话数。</p>
            <p>
              命中率口径 = 利好资讯方向与后续分析报告快照中涨跌幅方向一致的样本占比；样本量为可匹配到后续报告的利好/利空资讯条数。
            </p>
            <p>统计结果仅供学习参考，不构成投资建议，不代表未来收益。</p>
          </div>
        </>
      ) : null}

      {timeline ? (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium">历史分析与对话时间线</h3>
            <span className="text-xs text-muted-foreground">{timeline.events.length} 个事件</span>
          </div>
          <div className="space-y-3">
            {timeline.events.length === 0 ? (
              <p className="text-sm text-muted-foreground">该时间段内暂无分析与对话记录。</p>
            ) : (
              timeline.events.map((event) => (
                <TimelineEventCard key={`${event.type}-${event.id}`} event={event} />
              ))
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
