// 全局可观测性计数：进程内存内统计外部调用、缓存命中与失败次数。
// 单机 MVP 不做分布式上报，仅保证 UI 与管理接口可查。

import { sql } from "drizzle-orm";

import { getDb, schema } from "@/lib/db";

export interface ObservabilitySnapshot {
  externalCalls: number;
  externalFailures: number;
  cacheHits: number;
  cacheMisses: number;
  analysisRuns: number;
  chatRuns: number;
  cleanupRuns: number;
  refreshRuns: number;
  lastEventAt: string | null;
  externalFailureRate: number;
  cacheHitRate: number;
}

type CounterKey =
  | "externalCalls"
  | "externalFailures"
  | "cacheHits"
  | "cacheMisses"
  | "analysisRuns"
  | "chatRuns"
  | "cleanupRuns"
  | "refreshRuns";

type TaskKind = "analysis" | "chat" | "cleanup" | "refresh";

const COUNTER_KEYS = [
  "externalCalls",
  "externalFailures",
  "cacheHits",
  "cacheMisses",
  "analysisRuns",
  "chatRuns",
  "cleanupRuns",
  "refreshRuns",
] as const satisfies readonly CounterKey[];

const LAST_EVENT_KEY = "lastEventAt";

/** 进程级累计状态；数据库可用时该状态会从持久化表水合并持续同步。 */
const state: Record<CounterKey, number> & { lastEventAt: string | null } = {
  externalCalls: 0,
  externalFailures: 0,
  cacheHits: 0,
  cacheMisses: 0,
  analysisRuns: 0,
  chatRuns: 0,
  cleanupRuns: 0,
  refreshRuns: 0,
  lastEventAt: null,
};

let hydrationPromise: Promise<void> | null = null;
let metricsTableReadyPromise: Promise<void> | null = null;

function getMetricsDatabase(): ReturnType<typeof getDb> | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    return getDb();
  } catch {
    return null;
  }
}

/** 确保指标表存在；不生成迁移文件，运行期按需创建以便本地与云库开箱即用。 */
async function ensureMetricsTable(db: ReturnType<typeof getDb>): Promise<void> {
  metricsTableReadyPromise ??= db
    .execute(sql`
      CREATE TABLE IF NOT EXISTS "observability_metrics" (
        "key" text PRIMARY KEY NOT NULL,
        "metric_value" bigint NOT NULL DEFAULT 0,
        "timestamp_value" timestamp with time zone,
        "updated_at" timestamp with time zone NOT NULL
      )
    `)
    .then(() => undefined);

  return metricsTableReadyPromise;
}

async function persistCounter(key: CounterKey, delta: number): Promise<void> {
  const db = getMetricsDatabase();
  if (!db) {
    return;
  }

  await ensureMetricsTable(db);
  await db
    .insert(schema.observabilityMetrics)
    .values({
      key,
      metricValue: delta,
      timestampValue: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.observabilityMetrics.key,
      set: {
        metricValue: sql`${schema.observabilityMetrics.metricValue} + ${delta}`,
        updatedAt: new Date(),
      },
    });
}

async function persistLastEventAt(value: string): Promise<void> {
  const db = getMetricsDatabase();
  if (!db) {
    return;
  }

  const timestampValue = new Date(value);
  await ensureMetricsTable(db);
  await db
    .insert(schema.observabilityMetrics)
    .values({
      key: LAST_EVENT_KEY,
      metricValue: 0,
      timestampValue,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.observabilityMetrics.key,
      set: {
        timestampValue,
        updatedAt: new Date(),
      },
    });
}

function isCounterKey(key: string): key is CounterKey {
  return (COUNTER_KEYS as readonly string[]).includes(key);
}

/** 从持久化表读取历史累计值；已产生的新事件不会因旧快照被回退。 */
async function loadPersistedMetrics(): Promise<void> {
  const db = getMetricsDatabase();
  if (!db) {
    return;
  }

  await ensureMetricsTable(db);
  const rows = await db.select().from(schema.observabilityMetrics);
  for (const row of rows) {
    if (isCounterKey(row.key)) {
      state[row.key] = Math.max(state[row.key], row.metricValue);
      continue;
    }

    if (row.key === LAST_EVENT_KEY && row.timestampValue) {
      const persisted = row.timestampValue.toISOString();
      if (!state.lastEventAt || persisted > state.lastEventAt) {
        state.lastEventAt = persisted;
      }
    }
  }
}

/** 确保在读取指标前完成一次数据库水合；无数据库时直接返回。 */
export async function ensureObservabilityHydrated(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return;
  }

  hydrationPromise ??= loadPersistedMetrics()
    .catch(() => undefined)
    .finally(() => {
      hydrationPromise = null;
    });

  return hydrationPromise;
}

function touch(kind: CounterKey, delta = 1): void {
  state[kind] += delta;
  const lastEventAt = new Date().toISOString();
  state.lastEventAt = lastEventAt;
  void persistCounter(kind, delta).catch(() => undefined);
  void persistLastEventAt(lastEventAt).catch(() => undefined);
}

/** 记录一次外部数据源或模型调用结果。 */
export function recordExternalCall(success: boolean): void {
  touch("externalCalls");
  if (!success) {
    touch("externalFailures");
  }
}

/** 记录一次缓存命中。 */
export function recordCacheHit(): void {
  touch("cacheHits");
}

/** 记录一次缓存未命中。 */
export function recordCacheMiss(): void {
  touch("cacheMisses");
}

/** 记录分析、对话、清理与刷新任务次数。 */
export function recordTaskRun(kind: TaskKind): void {
  const counterByKind: Record<TaskKind, CounterKey> = {
    analysis: "analysisRuns",
    chat: "chatRuns",
    cleanup: "cleanupRuns",
    refresh: "refreshRuns",
  };
  touch(counterByKind[kind]);
}

/** 导出不可变快照与派生指标。 */
export function getObservabilitySnapshot(): ObservabilitySnapshot {
  const totalExternal = state.externalCalls;
  const totalCache = state.cacheHits + state.cacheMisses;
  return {
    externalCalls: state.externalCalls,
    externalFailures: state.externalFailures,
    cacheHits: state.cacheHits,
    cacheMisses: state.cacheMisses,
    analysisRuns: state.analysisRuns,
    chatRuns: state.chatRuns,
    cleanupRuns: state.cleanupRuns,
    refreshRuns: state.refreshRuns,
    lastEventAt: state.lastEventAt,
    externalFailureRate:
      totalExternal === 0 ? 0 : Number(((state.externalFailures / totalExternal) * 100).toFixed(1)),
    cacheHitRate:
      totalCache === 0 ? 0 : Number(((state.cacheHits / totalCache) * 100).toFixed(1)),
  };
}
