import { apiOk } from "@/lib/api-response";
import { mockKlines } from "@/lib/mock";

import type { AdjustType, KlinePeriod } from "@/lib/shared/types";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

const PERIODS: KlinePeriod[] = ["day", "week", "month", "minute"];
const ADJUSTS: AdjustType[] = ["qfq", "hfq", "none"];

// GET /api/stocks/:code/kline?period=&adjust=&limit=：K 线（mock）。
export async function GET(request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  const rawPeriod = request.nextUrl.searchParams.get("period") ?? "day";
  const rawAdjust = request.nextUrl.searchParams.get("adjust") ?? "qfq";
  const rawLimit = request.nextUrl.searchParams.get("limit");

  const period = PERIODS.includes(rawPeriod as KlinePeriod)
    ? (rawPeriod as KlinePeriod)
    : "day";
  const adjust = ADJUSTS.includes(rawAdjust as AdjustType)
    ? (rawAdjust as AdjustType)
    : "qfq";
  const limit = Number(rawLimit) || 30;

  const data =
    period === "day"
      ? mockKlines
          .filter((item) => item.code === code && item.adj_type === adjust)
          .slice(-limit)
      : [];

  return apiOk(data);
}
