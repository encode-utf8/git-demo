"use client";

import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import type { NewsItem } from "@/lib/shared/types";

interface NewsPanelProps {
  news: NewsItem[];
  analysisLoading: boolean;
  onGenerateAnalysis: () => void;
}

/** 资讯与影响周期面板。 */
export function NewsPanel({
  news,
  analysisLoading,
  onGenerateAnalysis,
}: NewsPanelProps) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">资讯与影响周期</h2>
        <Button type="button" variant="outline" size="sm" onClick={onGenerateAnalysis} disabled={analysisLoading}>
          {analysisLoading ? "生成中..." : "生成 AI 分析"}
        </Button>
      </div>
      <div className="space-y-3">
        {news.map((item) => (
          <div key={item.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <a href={item.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                {item.title}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">
                {item.sentiment === "positive" ? "利好" : item.sentiment === "negative" ? "利空" : "中性"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>来源：{item.source}</span>
              <span>影响 {item.impact_days} 天</span>
              <span>到期 {formatDateTime(item.expire_at)}</span>
              <span>置信度 {(item.confidence * 100).toFixed(0)}%</span>
              {item.tags.length > 0 ? <span>标签：{item.tags.join("、")}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
