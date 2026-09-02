import { apiOk } from "@/lib/api-response";

// GET /api/admin/datasources：数据源状态 mock 骨架。
export async function GET(): Promise<Response> {
  return apiOk([]);
}
