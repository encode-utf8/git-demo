import { apiFail, apiOk } from "@/lib/api-response";
import { normalizeStockCode } from "@/lib/market";
import { getReplayTimeline, normalizeReplayDays } from "@/lib/replay";

import type { NextRequest } from "next/server";

// GET /api/replay/timeline?code=600519&days=30：历史分析与对话时间线。
export async function GET(request: NextRequest): Promise<Response> {
  const params = request.nextUrl.searchParams;
  const code = normalizeStockCode(params.get("code") ?? "");
  if (!code) {
    return apiFail("VALIDATION_ERROR", "请输入 6 位沪深北 A 股代码。", 400);
  }

  const days = normalizeReplayDays(params.get("days"));
  return apiOk(await getReplayTimeline(code, days));
}
