import { apiFail, apiOk } from "@/lib/api-response";
import { listReports } from "@/lib/analysis";
import { normalizeStockCode } from "@/lib/market";

import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

// GET /api/stocks/:code/reports：历史报告时间线。
export async function GET(_request: NextRequest, context: RouteContext) {
  const rawCode = (await context.params).code;
  const code = normalizeStockCode(rawCode);
  if (!code) {
    return apiFail("VALIDATION_ERROR", "请输入 6 位沪深北 A 股代码。", 400);
  }

  return apiOk(await listReports(code));
}
