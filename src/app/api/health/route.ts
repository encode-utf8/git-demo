import { apiOk } from "@/lib/api-response";

// 健康检查：不依赖数据库与外部服务，仅验证 Next 应用存活。
export const dynamic = "force-dynamic";

export async function GET() {
  return apiOk({
    status: "ok",
    service: "stock-analysis-web",
    time: new Date().toISOString(),
  });
}
