import { apiOk, apiUnexpected } from "@/lib/api-response";
import { runCleanupJob, startScheduler } from "@/lib/scheduler";

import type { NextRequest } from "next/server";

// POST /api/admin/cleanup：清理到期且未置顶的资讯，软删除为 expired。
export async function POST(request: NextRequest): Promise<Response> {
  startScheduler();
  const body = (await request.json().catch(() => ({}))) as {
    before?: string;
    dry_run?: boolean;
  };

  try {
    const run = await runCleanupJob({
      before: body.before,
      dryRun: body.dry_run ?? false,
      source: "manual",
    });
    return apiOk(run, { status: 202 });
  } catch (error) {
    return apiUnexpected(error);
  }
}
