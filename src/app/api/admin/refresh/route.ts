import { apiFail, apiOk, apiUnexpected } from "@/lib/api-response";
import { runRefreshJob, startScheduler } from "@/lib/scheduler";
import { normalizeStockCode, SAMPLE_CODES } from "@/lib/market";

import type { NextRequest } from "next/server";

// POST /api/admin/refresh：手动刷新行情、K 线或资讯并记录任务。
export async function POST(request: NextRequest): Promise<Response> {
  startScheduler();
  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    target?: "quote" | "kline" | "news";
  };

  let codes: string[];
  if (body.code) {
    const normalized = normalizeStockCode(body.code);
    if (!normalized) {
      return apiFail("VALIDATION_ERROR", "请输入 6 位沪深北 A 股代码。", 400);
    }
    codes = [normalized];
  } else {
    codes = [...SAMPLE_CODES];
  }

  try {
    const run = await runRefreshJob({
      codes,
      target: body.target,
      source: "manual",
    });
    return apiOk(run, { status: 202 });
  } catch (error) {
    return apiUnexpected(error);
  }
}
