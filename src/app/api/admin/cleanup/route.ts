import { apiOk, apiUnexpected } from "@/lib/api-response";
import { cleanupExpiredNews } from "@/lib/news";
import { recordTaskRun } from "@/lib/observability";
import { store } from "@/lib/store";
import type { JobRun } from "@/lib/shared/types";

import type { NextRequest } from "next/server";

// POST /api/admin/cleanup：清理到期且未置顶的资讯，软删除为 expired。
export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    before?: string;
    dry_run?: boolean;
  };
  const startedAt = new Date().toISOString();
  const baseRun: JobRun = {
    id: `job-cleanup-${Date.now()}`,
    job_name: "cleanup",
    status: "running",
    started_at: startedAt,
    finished_at: null,
    detail: { dry_run: body.dry_run ?? false, before: body.before ?? startedAt },
  };
  await store.jobRuns.insert(baseRun);

  try {
    recordTaskRun("cleanup");
    const before = body.before ?? startedAt;
    const count = body.dry_run ? 0 : await cleanupExpiredNews(before);
    const completedRun: JobRun = {
      ...baseRun,
      status: "success",
      finished_at: new Date().toISOString(),
      detail: {
        ...baseRun.detail,
        cleaned_count: count,
      },
    };
    await store.jobRuns.insert(completedRun);
    return apiOk(completedRun, { status: 202 });
  } catch (error) {
    const failedRun: JobRun = {
      ...baseRun,
      status: "failed",
      finished_at: new Date().toISOString(),
      detail: {
        ...baseRun.detail,
        error: error instanceof Error ? error.message : "清理失败",
      },
    };
    await store.jobRuns.insert(failedRun);
    return apiUnexpected(error);
  }
}
