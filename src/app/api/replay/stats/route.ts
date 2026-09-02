import { apiOk } from "@/lib/api-response";

// GET /api/replay/stats：复盘统计 mock 骨架。
export async function GET(): Promise<Response> {
  return apiOk([]);
}
