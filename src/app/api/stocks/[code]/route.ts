import { apiOk } from "@/lib/api-response";
import { buildMockStock } from "@/lib/mock";

import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

// GET /api/stocks/:code：股票元数据（mock）。
export async function GET(_request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  return apiOk(buildMockStock(code));
}
