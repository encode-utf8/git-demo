"use client";

import type { MarketQuote, Stock } from "@/lib/shared/types";

interface QuotePanelProps {
  stock: Stock;
  quote: MarketQuote;
}

/** 当前行情概览面板。 */
export function QuotePanel({ stock, quote }: QuotePanelProps) {
  const items = [
    { label: "最新价", value: quote.price.toFixed(2), note: `${quote.change_pct >= 0 ? "+" : ""}${quote.change_pct.toFixed(2)}%` },
    { label: "今开", value: quote.open.toFixed(2), note: `昨收 ${quote.prev_close.toFixed(2)}` },
    { label: "最高 / 最低", value: `${quote.high.toFixed(2)} / ${quote.low.toFixed(2)}`, note: stock.exchange },
    { label: "成交量额", value: `${(quote.volume / 10000).toFixed(0)} 万手`, note: `${(quote.amount / 100000000).toFixed(1)} 亿元` },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="mt-2 text-2xl font-semibold">{item.value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{item.note}</div>
        </div>
      ))}
    </section>
  );
}
