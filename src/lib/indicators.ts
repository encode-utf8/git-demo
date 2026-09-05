// 技术指标本地计算：MA / MACD / KDJ / RSI / BOLL。
import type {
  Kline,
  KlinePeriod,
  TechnicalIndicators,
} from "@/lib/shared/types";

/** 计算简单移动平均；数据不足返回 null。 */
function sma(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) {
    return null;
  }
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

/** 计算 RSI（Wilder 平滑）完整序列；头部数据不足的位置为 null。 */
export function calculateRsiSeries(values: number[], period: number): Array<number | null> {
  if (values.length <= period) {
    return [];
  }

  const result: Array<number | null> = Array.from({ length: period }, () => null);
  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;
  for (let index = period; index < values.length; index += 1) {
    if (index > period) {
      const change = values[index] - values[index - 1];
      averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
      averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
    }
    result.push(averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss));
  }

  return result;
}

/** 计算最新 RSI 值。 */
function rsi(values: number[], period: number): number | null {
  return calculateRsiSeries(values, period).at(-1) ?? null;
}

/** 单个 MACD 数据点，用于图表展示。 */
export interface MacdPoint {
  index: number;
  dif: number;
  dea: number;
  histogram: number;
}

/** 单个 KDJ 数据点，用于图表展示。 */
export interface KdjPoint {
  index: number;
  k: number;
  d: number;
  j: number;
}

/** 单个 BOLL 数据点，用于图表展示。 */
export interface BollPoint {
  index: number;
  upper: number;
  middle: number;
  lower: number;
}

/** 由 K 线计算完整 KDJ 序列。 */
export function calculateKdjSeries(klines: Kline[], period = 9): KdjPoint[] {
  if (klines.length < period) {
    return [];
  }

  const closes = klines.map((item) => item.close);
  const highs = klines.map((item) => item.high);
  const lows = klines.map((item) => item.low);
  const points: KdjPoint[] = [];
  let previousK = 50;
  let previousD = 50;

  for (let index = period - 1; index < klines.length; index += 1) {
    const lowest = Math.min(...lows.slice(index - period + 1, index + 1));
    const highest = Math.max(...highs.slice(index - period + 1, index + 1));
    const rsv = highest === lowest ? 50 : ((closes[index] - lowest) / (highest - lowest)) * 100;
    previousK = (2 / 3) * previousK + (1 / 3) * rsv;
    previousD = (2 / 3) * previousD + (1 / 3) * previousK;
    points.push({
      index,
      k: previousK,
      d: previousD,
      j: 3 * previousK - 2 * previousD,
    });
  }

  return points;
}

/** 由收盘价计算完整 BOLL 序列。 */
export function calculateBollSeries(values: number[], period = 20): BollPoint[] {
  if (values.length < period) {
    return [];
  }

  const points: BollPoint[] = [];
  for (let index = period - 1; index < values.length; index += 1) {
    const slice = values.slice(index - period + 1, index + 1);
    const average = slice.reduce((sum, value) => sum + value, 0) / period;
    const variance = slice.reduce((sum, value) => sum + (value - average) ** 2, 0) / period;
    const deviation = Math.sqrt(variance);
    points.push({
      index,
      upper: average + 2 * deviation,
      middle: average,
      lower: average - 2 * deviation,
    });
  }

  return points;
}

/** 计算完整 EMA 序列；数据不足的头部位置为 null。 */
function emaSeries(values: number[], period: number): Array<number | null> {
  const factor = 2 / (period + 1);
  const result: Array<number | null> = [];
  let current: number | null = null;

  for (let index = 0; index < values.length; index += 1) {
    if (index + 1 < period) {
      result.push(null);
      continue;
    }
    if (current === null) {
      current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
    } else {
      current = values[index] * factor + current * (1 - factor);
    }
    result.push(current);
  }

  return result;
}

/** 由收盘价序列计算完整 MACD 序列，供图表展示金叉/死叉。 */
export function calculateMacdSeries(values: number[]): MacdPoint[] {
  const ema12Series = emaSeries(values, 12);
  const ema26Series = emaSeries(values, 26);
  const difSeries = values.map((_, index) =>
    ema12Series[index] !== null && ema26Series[index] !== null
      ? (ema12Series[index] as number) - (ema26Series[index] as number)
      : null,
  );

  const deaSeries: Array<number | null> = [];
  let currentDea: number | null = null;
  const deaFactor = 2 / (9 + 1);
  for (let index = 0; index < difSeries.length; index += 1) {
    const dif = difSeries[index];
    if (dif === null) {
      deaSeries.push(null);
      continue;
    }

    const validDifs = difSeries.slice(0, index + 1).filter((value): value is number => value !== null);
    if (validDifs.length < 9) {
      deaSeries.push(null);
      continue;
    }
    if (currentDea === null) {
      currentDea = validDifs.slice(0, 9).reduce((sum, value) => sum + value, 0) / 9;
    } else {
      currentDea = dif * deaFactor + currentDea * (1 - deaFactor);
    }
    deaSeries.push(currentDea);
  }

  const points: MacdPoint[] = [];
  for (let index = 0; index < difSeries.length; index += 1) {
    const dif = difSeries[index];
    const dea = deaSeries[index];
    if (dif !== null && dea !== null) {
      points.push({
        index,
        dif,
        dea,
        histogram: (dif - dea) * 2,
      });
    }
  }

  return points;
}

/** 由收盘价列表计算最新 MACD 指标。 */
function macd(values: number[]): { dif: number | null; dea: number | null; histogram: number | null } {
  const latest = calculateMacdSeries(values).at(-1);
  return latest
    ? { dif: latest.dif, dea: latest.dea, histogram: latest.histogram }
    : { dif: null, dea: null, histogram: null };
}

/** 由 K 线计算完整技术指标。 */
export function calculateIndicators(
  klines: Kline[],
  code: string,
  period: KlinePeriod,
): TechnicalIndicators {
  const closes = klines.map((item) => item.close);
  const latestKdj = calculateKdjSeries(klines).at(-1);
  const latestBoll = calculateBollSeries(closes).at(-1);

  return {
    code,
    period,
    updated_at: new Date().toISOString(),
    ma: {
      ma5: sma(closes, 5),
      ma10: sma(closes, 10),
      ma20: sma(closes, 20),
      ma60: sma(closes, 60),
    },
    macd: macd(closes),
    kdj: {
      k: latestKdj ? Number(latestKdj.k.toFixed(2)) : null,
      d: latestKdj ? Number(latestKdj.d.toFixed(2)) : null,
      j: latestKdj ? Number(latestKdj.j.toFixed(2)) : null,
    },
    rsi: {
      rsi6: rsi(closes, 6),
      rsi12: rsi(closes, 12),
      rsi24: rsi(closes, 24),
    },
    boll: {
      upper: latestBoll ? Number(latestBoll.upper.toFixed(2)) : null,
      middle: latestBoll ? Number(latestBoll.middle.toFixed(2)) : null,
      lower: latestBoll ? Number(latestBoll.lower.toFixed(2)) : null,
    },
  };
}
