// 全局可观测性计数：进程内存内统计外部调用、缓存命中与失败次数。
// 单机 MVP 不做分布式上报，仅保证 UI 与管理接口可查。

export interface ObservabilitySnapshot {
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
}

/** 进程级累计状态；开发模式下热更新会重置，生产环境运行期稳定。 */
const state = {
  externalCalls: 0,
  externalFailures: 0,
  cacheHits: 0,
  cacheMisses: 0,
  analysisRuns: 0,
  chatRuns: 0,
  cleanupRuns: 0,
  lastEventAt: null as string | null,
};

/** 记录一次外部数据源或模型调用结果。 */
export function recordExternalCall(success: boolean): void {
  state.externalCalls += 1;
  if (!success) {
    state.externalFailures += 1;
  }
  state.lastEventAt = new Date().toISOString();
}

/** 记录一次缓存命中。 */
export function recordCacheHit(): void {
  state.cacheHits += 1;
  state.lastEventAt = new Date().toISOString();
}

/** 记录一次缓存未命中。 */
export function recordCacheMiss(): void {
  state.cacheMisses += 1;
  state.lastEventAt = new Date().toISOString();
}

/** 记录分析、对话与清理任务次数。 */
export function recordTaskRun(kind: "analysis" | "chat" | "cleanup"): void {
  if (kind === "analysis") {
    state.analysisRuns += 1;
  } else if (kind === "chat") {
    state.chatRuns += 1;
  } else {
    state.cleanupRuns += 1;
  }
  state.lastEventAt = new Date().toISOString();
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
    lastEventAt: state.lastEventAt,
    externalFailureRate:
      totalExternal === 0 ? 0 : Number(((state.externalFailures / totalExternal) * 100).toFixed(1)),
    cacheHitRate:
      totalCache === 0 ? 0 : Number(((state.cacheHits / totalCache) * 100).toFixed(1)),
  };
}
