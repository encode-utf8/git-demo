import { apiOk } from "@/lib/api-response";
import { mockIndicators } from "@/lib/mock";

import type { KlinePeriod } from "@/lib/shared/types";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

// GET /api/stocks/:code/indicators：技术指标（mock）。
export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  const rawPeriod = request.nextUrl.searchParams.get("period") ?? "day";
  const period: KlinePeriod = ["week", "month", "minute"].includes(rawPeriod)
    ? (rawPeriod as KlinePeriod)
    : "day";

  return apiOk({ ...mockIndicators, code, period });
}
