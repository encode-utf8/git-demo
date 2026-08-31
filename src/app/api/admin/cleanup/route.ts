import { apiOk } from "@/lib/api-response";
import { mockJobRuns } from "@/lib/mock";

import type { AdminCleanupRequest } from "@/lib/shared/types";

// POST /api/admin/cleanup：单机管理任务：清理到期资讯（mock）。
export async function POST() {
  const run = mockJobRuns[0] ?? {
    id: "job-cleanup-mock",
    job_name: "cleanup",
    status: "success" as const,
    started_at: new Date().toISOString(),
    finished_at: new Date().toISOString(),
    detail: null,
  };
  return apiOk({ ...run, job_name: "cleanup" }, { status: 202 });
}

export type { AdminCleanupRequest };
