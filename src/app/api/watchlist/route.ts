import { apiOk } from "@/lib/api-response";

import type { NextRequest } from "next/server";

// GET /api/watchlist：自选股列表 mock 骨架。
export async function GET(): Promise<Response> {
  return apiOk([]);
}

// POST /api/watchlist：新增自选股 mock 骨架。
export async function POST(request: NextRequest): Promise<Response> {
  void request;
  return apiOk(null);
}

// DELETE /api/watchlist?code=：删除自选股 mock 骨架。
export async function DELETE(request: NextRequest): Promise<Response> {
  void request.nextUrl.searchParams.get("code");
  return apiOk(null);
}
