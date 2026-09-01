import type { ExchangeCode, Stock } from "@/lib/shared/types";

/** 已知股票名称映射，便于本地无外部数据源时展示可读信息。 */
const KNOWN_STOCKS: Record<string, Pick<Stock, "name" | "industry">> = {
  "600519": { name: "贵州茅台", industry: "白酒" },
  "601318": { name: "中国平安", industry: "保险" },
  "688981": { name: "中芯国际", industry: "半导体" },
  "000001": { name: "平安银行", industry: "银行" },
  "002594": { name: "比亚迪", industry: "汽车整车" },
  "300750": { name: "宁德时代", industry: "电池" },
  "830799": { name: "艾融软件", industry: "金融科技" },
};

/** 常见沪深北 A 股代码前缀，用于市场识别。 */
const EXCHANGE_PREFIXES: Array<{ prefix: string[]; exchange: ExchangeCode }> = [
  { prefix: ["600", "601", "603", "605", "688", "689"], exchange: "SH" },
  { prefix: ["000", "001", "002", "003", "300", "301"], exchange: "SZ" },
  { prefix: ["43", "83", "87", "88", "92"], exchange: "BJ" },
];

/** 识别 A 股市场。 */
export function detectExchange(code: string): ExchangeCode | null {
  for (const item of EXCHANGE_PREFIXES) {
    if (item.prefix.some((prefix) => code.startsWith(prefix))) {
      return item.exchange;
    }
  }
  return null;
}

/** 规范化并校验股票代码；非法输入返回 null。 */
export function normalizeStockCode(input: string): string | null {
  const code = input.trim();
  if (!/^\d{6}$/.test(code)) {
    return null;
  }
  return detectExchange(code) ? code : null;
}

/** 根据代码生成股票元数据。 */
export function resolveStock(code: string): Stock {
  const exchange = detectExchange(code) ?? "SH";
  const known = KNOWN_STOCKS[code];
  return {
    code,
    name: known?.name ?? `股票 ${code}`,
    exchange,
    industry: known?.industry ?? null,
    meta: {
      market: exchange === "SH" ? "上海" : exchange === "SZ" ? "深圳" : "北京",
      source: "本地识别",
    },
  };
}

/** 建议用于验收的三市场样例。 */
export const SAMPLE_CODES = ["600519", "000001", "830799"] as const;
