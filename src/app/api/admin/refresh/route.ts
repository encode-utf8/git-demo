import { apiOk } from "@/lib/api-response";
import { mockJobRuns } from "@/lib/mock";

import type { AdminRefreshRequest } from "@/lib/shared/types";

// POST /api/admin/refresh：单机管理任务：刷新行情/资讯（mock）。
export async function POST() {
  const run = mockJobRuns[0] ?? {
    id: "job-refresh-mock",
    job_name: "refresh",
    status: "success" as const,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    detail: null,
  };
  return apiOk({ ...run, job_name: "refresh" }, { status: 202 });
}

export type { AdminRefreshRequest };
