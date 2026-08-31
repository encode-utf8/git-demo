import { apiOk } from "@/lib/api-response";
import { mockNews } from "@/lib/mock";

import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

// GET /api/stocks/:code/news：已抓取资讯（mock）。
export async function GET(_request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  return apiOk(mockNews.map((item) => ({ ...item, code })));
}
