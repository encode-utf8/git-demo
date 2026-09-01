import { apiFail, apiOk, apiUnexpected } from "@/lib/api-response";
import { getKlines, getMarketQuote } from "@/lib/market-data";
import { normalizeStockCode, SAMPLE_CODES } from "@/lib/market";
import { getNews } from "@/lib/news";
import { store } from "@/lib/store";
import type { JobRun } from "@/lib/shared/types";

import type { NextRequest } from "next/server";

// POST /api/admin/refresh：手动刷新行情/K 线/资讯并记录任务。
export async function POST(request: NextRequest): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    code?: string;
    target?: "quote" | "kline" | "news";
  };

  const codes: string[] = [];
  if (body.code) {
    const normalized = normalizeStockCode(body.code);
    if (!normalized) {
      return apiFail("VALIDATION_ERROR", "请输入 6 位沪深北 A 股代码。", 400);
    }
    codes.push(normalized);
  } else {
    codes.push(...SAMPLE_CODES);
  }

  const startedAt = new Date().toISOString();
  const baseRun: JobRun = {
    id: `job-refresh-${Date.now()}`,
    job_name: "refresh",
    status: "running",
    started_at: startedAt,
    finished_at: null,
    detail: { codes, target: body.target ?? "all" },
  };
  await store.jobRuns.insert(baseRun);

  try {
    for (const code of codes) {
      if (!body.target || body.target === "quote") {
        await getMarketQuote(code, true);
      }
      if (!body.target || body.target === "kline") {
        await getKlines(code, "day", "qfq", 120, true);
      }
      if (!body.target || body.target === "news") {
        await getNews(code, true);
      }
    }

    const completedRun: JobRun = {
      ...baseRun,
      status: "success",
      finished_at: new Date().toISOString(),
    };
    await store.jobRuns.insert(completedRun);
    return apiOk(completedRun, { status: 202 });
  } catch (error) {
    const failedRun: JobRun = {
      ...baseRun,
      status: "failed",
      finished_at: new Date().toISOString(),
      detail: {
        ...baseRun.detail,
        error: error instanceof Error ? error.message : "刷新失败",
      },
    };
    await store.jobRuns.insert(failedRun);
    return apiUnexpected(error);
  }
}
