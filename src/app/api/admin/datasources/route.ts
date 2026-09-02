import { apiOk, apiUnexpected } from "@/lib/api-response";
import { getDataSourceHealthSnapshot } from "@/lib/datasource-health";
import { startScheduler } from "@/lib/scheduler";

// GET /api/admin/datasources：返回四类数据源健康状态与 refresh/cleanup 调度任务。
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  startScheduler();

  try {
    const snapshot = await getDataSourceHealthSnapshot();
    return apiOk(snapshot);
  } catch (error) {
    return apiUnexpected(error);
  }
}
