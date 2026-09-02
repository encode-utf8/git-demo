// 确定性行情生成器：在无外部数据源时提供稳定的演示数据，并明确 source 标记。
import type {
  AdjustType,
  Kline,
  KlinePeriod,
  MarketQuote,
} from "@/lib/shared/types";

/** 将字符串转为 32 位有符号整数种子。 */
function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 简单可复现伪随机数生成器。 */
function mulberry32(seed: number): () => number {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

/** 保留两位小数。 */
function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** 常见股票演示基准价，便于无外部数据源时贴近公开行情量级。 */
const KNOWN_BASE_PRICES: Record<string, number> = {
  "600519": 1688,
  "601318": 52,
  "688981": 58,
  "000001": 11.6,
  "002594": 268,
  "300750": 218,
  "830799": 18.8,
};

/** 根据代码生成稳定基础价，已知股票使用近似基准价。 */
function basePrice(code: string): number {
  if (KNOWN_BASE_PRICES[code]) {
    return KNOWN_BASE_PRICES[code];
  }
  const seed = hashSeed(`base:${code}`);
  const random = mulberry32(seed);
  return round(12 + random() * 168, 2);
}

/** 当前日期往前寻找交易日。 */
function lastTradingDay(from: Date): Date {
  const day = new Date(from);
  while (day.getDay() === 0 || day.getDay() === 6) {
    day.setDate(day.getDate() - 1);
  }
  return day;
}

/** 日期加自然日。 */
function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

/** 判断是否为周末。 */
function isWeekend(date: Date): boolean {
  return date.getDay() === 0 || date.getDay() === 6;
}

/** 生成当日确定性行情快照。 */
export function buildDeterministicQuote(code: string): MarketQuote {
  const now = new Date();
  const seed = hashSeed(`quote:${code}:${now.toISOString().slice(0, 10)}`);
  const random = mulberry32(seed);
  const prevClose = basePrice(code);
  const changePct = round((random() - 0.46) * 5, 2);
  const price = round(prevClose * (1 + changePct / 100), 2);
  const open = round(prevClose * (1 + (random() - 0.5) * 0.02), 2);
  const high = round(Math.max(open, price) * (1 + random() * 0.015), 2);
  const low = round(Math.min(open, price) * (1 - random() * 0.015), 2);
  const volume = Math.round(2_000_000 + random() * 8_000_000);
  const amount = Math.round(volume * price * 10);

  return {
    code,
    ts: now.toISOString(),
    price,
    change_pct: changePct,
    open,
    high,
    low,
    prev_close: prevClose,
    volume,
    amount,
    turnover_rate: round(0.08 + random() * 2.2, 2),
    pe: round(8 + random() * 30, 1),
    pb: round(0.8 + random() * 8, 1),
    market_cap: Math.round(price * (2_000_000_000 + random() * 8_000_000_000)),
    float_cap: Math.round(price * (1_500_000_000 + random() * 5_000_000_000)),
    source: "deterministic-fallback",
    fetched_at: now.toISOString(),
  };
}

/** 生成分钟级演示 K 线。 */
function buildMinuteBars(code: string, adjust: AdjustType, latestPrice: number): Kline[] {
  const seed = hashSeed(`kline:${code}:minute:${adjust}`);
  const random = mulberry32(seed);
  const result: Kline[] = [];
  const sessions = [
    { start: 9 * 60 + 30, end: 11 * 60 + 30 },
    { start: 13 * 60, end: 15 * 60 },
  ];
  let previousClose = latestPrice * 0.98;

  for (const session of sessions) {
    for (let minute = session.start; minute <= session.end; minute += 2) {
      const hour = Math.floor(minute / 60);
      const minuteOfHour = minute % 60;
      const change = (random() - 0.5) * 0.004;
      const open = previousClose;
      const close = Math.max(0.5, round(open * (1 + change), 2));
      const high = Math.max(open, close) * (1 + random() * 0.002);
      const low = Math.min(open, close) * (1 - random() * 0.002);
      result.push({
        code,
        period: "minute",
        ts: new Date(2026, 8, 1, hour, minuteOfHour).toISOString(),
        open: round(open, 2),
        high: round(high, 2),
        low: round(low, 2),
        close: round(close, 2),
        volume: Math.round(30_000 + random() * 160_000),
        amount: Math.round((30_000 + random() * 160_000) * close),
        adj_type: adjust,
      });
      previousClose = close;
    }
  }

  return result;
}

/** 生成演示 K 线，支持 day/week/month/minute。 */
export function buildDeterministicKlines(
  code: string,
  period: KlinePeriod,
  adjust: AdjustType,
  limit: number,
  latestPrice?: number,
): Kline[] {
  const price = latestPrice ?? basePrice(code);
  if (period === "minute") {
    return buildMinuteBars(code, adjust, price).slice(-limit);
  }

  const seed = hashSeed(`kline:${code}:${period}:${adjust}`);
  const random = mulberry32(seed);
  const today = lastTradingDay(new Date());
  const dates: Date[] = [];
  let cursor = new Date(today);

  if (period === "day") {
    while (dates.length < limit) {
      if (!isWeekend(cursor)) {
        dates.unshift(new Date(cursor));
      }
      cursor = addDays(cursor, -1);
    }
  } else if (period === "week") {
    for (let index = limit - 1; index >= 0; index -= 1) {
      dates.unshift(addDays(today, -7 * index));
    }
  } else {
    for (let index = limit - 1; index >= 0; index -= 1) {
      const monthDate = new Date(today);
      monthDate.setDate(1);
      monthDate.setMonth(monthDate.getMonth() - index);
      dates.push(monthDate);
    }
  }

  let previousClose = price * 0.9;
  return dates.map((date, index) => {
    const progress = index / Math.max(dates.length - 1, 1);
    const trend = (progress - 0.5) * 0.08;
    const wave = (random() - 0.5) * 0.03;
    const open = previousClose;
    const close = index === dates.length - 1 ? price : round(price * (1 + trend + wave), 2);
    const high = round(Math.max(open, close) * (1 + random() * 0.018), 2);
    const low = round(Math.min(open, close) * (1 - random() * 0.018), 2);
    const volume = Math.round(1_500_000 + random() * 7_500_000);
    previousClose = close;
    return {
      code,
      period,
      ts: date.toISOString(),
      open: round(open, 2),
      high,
      low,
      close: round(close, 2),
      volume,
      amount: Math.round(volume * close),
      adj_type: adjust,
    };
  });
}
