"use client";

import { formatDateTime } from "@/lib/format";
import type { AnalysisReport } from "@/lib/shared/types";

interface AnalysisPanelProps {
  reports: AnalysisReport[];
  loading: boolean;
}

/** 历史分析时间线面板。 */
export function AnalysisPanel({ reports, loading }: AnalysisPanelProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">历史分析时间线</h2>
      <div className="mt-3 space-y-4">
        {loading && reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">历史报告加载中...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无历史报告，点击“生成 AI 分析”开始。</p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{formatDateTime(report.created_at)}</span>
                <span className="text-xs text-muted-foreground">{report.news_refs.length} 条引用</span>
              </div>
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-foreground">
                {report.content}
              </pre>
              <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {report.risk_note}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
