"use client";

import { formatDateTime } from "@/lib/format";
import type { Kline, TechnicalIndicators } from "@/lib/shared/types";

interface IndicatorsPanelProps {
  indicators: TechnicalIndicators | null;
  klines: Kline[];
}

function CloseLineChart({ klines }: { klines: Kline[] }) {
  if (klines.length < 2) {
    return null;
  }

  const width = 900;
  const height = 220;
  const padding = 22;
  const closes = klines.map((item) => item.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const x = (index: number) =>
    padding + (index / Math.max(closes.length - 1, 1)) * (width - padding * 2);
  const y = (value: number) =>
    padding + ((max - value) / range) * (height - padding * 2);
  const points = closes.map((value, index) => `${x(index)},${y(value)}`).join(" ");

  return (
    <div className="overflow-x-auto rounded-lg border bg-white p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]" aria-label="收盘价走势">
        <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="2" />
      </svg>
    </div>
  );
}

/** 技术指标面板。 */
export function IndicatorsPanel({ indicators, klines }: IndicatorsPanelProps) {
  if (!indicators) {
    return null;
  }

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold">技术指标</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        本地计算，更新时间 {formatDateTime(indicators.updated_at)}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>MA5：{indicators.ma.ma5?.toFixed(2) ?? "暂无"}</div>
          <div>MA10：{indicators.ma.ma10?.toFixed(2) ?? "暂无"}</div>
          <div>MA20：{indicators.ma.ma20?.toFixed(2) ?? "暂无"}</div>
          <div>MA60：{indicators.ma.ma60?.toFixed(2) ?? "暂无"}</div>
          <div>MACD DIF：{indicators.macd.dif?.toFixed(2) ?? "暂无"}</div>
          <div>MACD DEA：{indicators.macd.dea?.toFixed(2) ?? "暂无"}</div>
          <div>KDJ：{indicators.kdj.k?.toFixed(1) ?? "-"} / {indicators.kdj.d?.toFixed(1) ?? "-"} / {indicators.kdj.j?.toFixed(1) ?? "-"}</div>
          <div>RSI6：{indicators.rsi.rsi6?.toFixed(1) ?? "暂无"}</div>
          <div>RSI12：{indicators.rsi.rsi12?.toFixed(1) ?? "暂无"}</div>
          <div>RSI24：{indicators.rsi.rsi24?.toFixed(1) ?? "暂无"}</div>
          <div>BOLL 上轨：{indicators.boll.upper?.toFixed(2) ?? "暂无"}</div>
          <div>BOLL 下轨：{indicators.boll.lower?.toFixed(2) ?? "暂无"}</div>
        </div>
        <CloseLineChart klines={klines} />
      </div>
    </section>
  );
}
