import { apiFail, apiOk } from "@/lib/api-response";
import { getStock } from "@/lib/market-data";
import { normalizeStockCode } from "@/lib/market";

import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

// GET /api/stocks/:code/profile：股票元数据与市场识别。
export async function GET(_request: NextRequest, context: RouteContext) {
  const rawCode = (await context.params).code;
  const code = normalizeStockCode(rawCode);
  if (!code) {
    return apiFail("VALIDATION_ERROR", "请输入 6 位沪深北 A 股代码。", 400);
  }

  return apiOk(await getStock(code));
}
