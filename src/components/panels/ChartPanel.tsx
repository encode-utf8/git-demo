"use client";

import { formatDateTime, freshnessText } from "@/lib/format";
import type {
  AdjustType,
  Kline,
  KlinePeriod,
  MarketQuote,
  Stock,
} from "@/lib/shared/types";

interface ChartPanelProps {
  stock: Stock;
  quote: MarketQuote;
  klines: Kline[];
  period: KlinePeriod;
  adjust: AdjustType;
  loading: boolean;
  onPeriodChange: (period: KlinePeriod) => void;
  onAdjustChange: (adjust: AdjustType) => void;
}

function CandlestickChart({ klines }: { klines: Kline[] }) {
  if (klines.length === 0) {
    return <div className="text-sm text-muted-foreground">暂无 K 线数据。</div>;
  }

  const width = 900;
  const height = 320;
  const volumeHeight = 70;
  const padding = 22;
  const plotHeight = height - padding * 2 - volumeHeight;
  const minPrice = Math.min(...klines.map((item) => item.low));
  const maxPrice = Math.max(...klines.map((item) => item.high));
  const range = maxPrice - minPrice || 1;
  const volumeMax = Math.max(...klines.map((item) => item.volume));
  const slot = (width - padding * 2) / klines.length;
  const candleWidth = Math.max(2, slot * 0.6);

  const yPrice = (price: number) =>
    padding + ((maxPrice - price) / range) * plotHeight;
  const yVolume = (volume: number) =>
    height - padding - (volume / volumeMax) * volumeHeight;

  return (
    <div className="overflow-x-auto rounded-lg border bg-white p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[720px]"
        role="img"
        aria-label="K 线图"
      >
        <line
          x1={padding}
          x2={width - padding}
          y1={height - padding - volumeHeight}
          y2={height - padding - volumeHeight}
          stroke="#e5e7eb"
        />
        {klines.map((item, index) => {
          const center = padding + index * slot + slot / 2;
          const color = item.close >= item.open ? "#ef4444" : "#22c55e";
          const highY = yPrice(item.high);
          const lowY = yPrice(item.low);
          const openY = yPrice(item.open);
          const closeY = yPrice(item.close);
          return (
            <g key={`${item.ts}-${index}`}>
              <line x1={center} x2={center} y1={highY} y2={lowY} stroke={color} />
              <rect
                x={center - candleWidth / 2}
                y={Math.min(openY, closeY)}
                width={candleWidth}
                height={Math.max(Math.abs(closeY - openY), 1)}
                fill={color}
              />
              <rect
                x={center - candleWidth / 2}
                y={yVolume(item.volume)}
                width={candleWidth}
                height={height - padding - yVolume(item.volume)}
                fill={color}
                opacity={0.45}
              />
            </g>
          );
        })}
        <text x={padding} y={height - 4} fontSize="11" fill="#737373">
          {klines[0]?.ts.slice(0, 10)}
        </text>
        <text x={width - 100} y={height - 4} fontSize="11" fill="#737373">
          {klines.at(-1)?.ts.slice(0, 10)}
        </text>
      </svg>
    </div>
  );
}

/** K 线图表面板。 */
export function ChartPanel({
  stock,
  quote,
  klines,
  period,
  adjust,
  loading,
  onPeriodChange,
  onAdjustChange,
}: ChartPanelProps) {
  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{stock.name}（{stock.code}）盘面</h2>
          <p className="text-xs text-muted-foreground">
            数据时间：{formatDateTime(quote.fetched_at)}（{freshnessText(quote.fetched_at)}），
            来源：{quote.source}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={period}
            onChange={(event) => onPeriodChange(event.target.value as KlinePeriod)}
            className="rounded-md border px-2 py-1.5 text-sm"
            aria-label="K 线周期"
          >
            <option value="minute">分时</option>
            <option value="day">日 K</option>
            <option value="week">周 K</option>
            <option value="month">月 K</option>
          </select>
          <select
            value={adjust}
            onChange={(event) => onAdjustChange(event.target.value as AdjustType)}
            className="rounded-md border px-2 py-1.5 text-sm"
            aria-label="复权方式"
          >
            <option value="qfq">前复权</option>
            <option value="hfq">后复权</option>
            <option value="none">不复权</option>
          </select>
        </div>
      </div>
      {loading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">图表加载中...</div>
      ) : (
        <CandlestickChart klines={klines} />
      )}
    </section>
  );
}
