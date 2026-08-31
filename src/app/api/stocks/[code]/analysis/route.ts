import { apiOk } from "@/lib/api-response";
import { mockReports } from "@/lib/mock";

import type { AnalysisRequest } from "@/lib/shared/types";
import type { NextRequest } from "next/server";

type RouteContext = { params: Promise<{ code: string }> };

// POST /api/stocks/:code/analysis：触发 AI 分析（mock）。
export async function POST(_request: NextRequest, context: RouteContext) {
  const { code } = await context.params;
  const report = mockReports[0] ?? {
    id: "report-mock",
    code,
    created_at: new Date().toISOString(),
    data_snapshot: null,
    news_refs: [],
    content: "占位分析报告。",
    risk_note: "仅供学习参考，不构成投资建议。",
  };
  return apiOk({ ...report, code }, { status: 202 });
}

// 请求体结构已冻结，当前 mock 不解析业务内容。
export type { AnalysisRequest };
