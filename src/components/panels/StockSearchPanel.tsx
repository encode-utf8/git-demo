"use client";

import { Button } from "@/components/ui/button";
import type { FormEvent } from "react";

interface StockSearchPanelProps {
  input: string;
  loading: boolean;
  code: string | null;
  onInputChange: (value: string) => void;
  onSearch: (event: FormEvent<HTMLFormElement>) => void;
  onRefresh: () => void;
  onCleanup: () => void;
}

/** 股票查询与手动任务操作面板。 */
export function StockSearchPanel({
  input,
  loading,
  code,
  onInputChange,
  onSearch,
  onRefresh,
  onCleanup,
}: StockSearchPanelProps) {
  return (
    <form onSubmit={onSearch} className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm md:flex-row">
      <input
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        placeholder="例如：600519"
        className="min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
        aria-label="股票代码"
      />
      <Button type="submit" disabled={loading}>
        {loading ? "查询中..." : "查询股票"}
      </Button>
      <Button type="button" variant="outline" onClick={onRefresh} disabled={!code || loading}>
        强制刷新
      </Button>
      <Button type="button" variant="outline" onClick={onCleanup}>
        清理到期资讯
      </Button>
    </form>
  );
}
