"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { formatDateTime } from "@/lib/format";
import type { AnalysisReport } from "@/lib/shared/types";

interface AnalysisPanelProps {
  reports: AnalysisReport[];
  loading: boolean;
}

/** Markdown 渲染容器。 */
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

/** 周期内 AI 分析面板。 */
export function AnalysisPanel({ reports, loading }: AnalysisPanelProps) {
  return (
    <div className="flex h-[560px] flex-col rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">周期内 AI 分析</h2>
      <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {loading && reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">历史报告加载中...</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">暂无历史报告，点击“生成 AI 分析”开始。</p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-medium">{formatDateTime(report.created_at)}</span>
                <span className="text-xs text-muted-foreground">{report.news_refs.length} 条引用</span>
              </div>
              <MarkdownContent content={report.content} />
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
