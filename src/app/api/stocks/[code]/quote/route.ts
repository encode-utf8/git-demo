import { apiOk } from "@/lib/api-response";
import { mockQuote } from "@/lib/mock";

import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

// GET /api/stocks/:code/quote：当前行情快照（mock）。
export async function GET(_request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  return apiOk({ ...mockQuote, code });
}
