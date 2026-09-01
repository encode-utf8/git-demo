import { apiFail, apiOk } from "@/lib/api-response";
import { listConversations } from "@/lib/chat";
import { normalizeStockCode } from "@/lib/market";

import type { NextRequest } from "next/server";

// GET /api/conversations?code=：某只股票的历史会话列表。
export async function GET(request: NextRequest): Promise<Response> {
  const rawCode = request.nextUrl.searchParams.get("code") ?? "";
  const code = normalizeStockCode(rawCode);
  if (!code) {
    return apiFail("VALIDATION_ERROR", "请输入 6 位沪深北 A 股代码。", 400);
  }

  return apiOk(await listConversations(code));
}
