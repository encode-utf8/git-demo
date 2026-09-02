import { apiOk } from "@/lib/api-response";
import {
  ensureObservabilityHydrated,
  getObservabilitySnapshot,
} from "@/lib/observability";
import { startScheduler } from "@/lib/scheduler";
import { store } from "@/lib/store";

// GET /api/admin/observability：读取外部调用、失败率、缓存命中与任务日志。
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  startScheduler();
  await ensureObservabilityHydrated();
  const jobs = await store.jobRuns.listRecent(20);
  return apiOk({
    metrics: getObservabilitySnapshot(),
    recentJobs: jobs,
  });
}
