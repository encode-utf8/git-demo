import { apiOk } from "@/lib/api-response";
import { mockReports } from "@/lib/mock";

import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

// GET /api/stocks/:code/reports：历史报告（mock）。
export async function GET(_request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  return apiOk(mockReports.map((item) => ({ ...item, code })));
}
