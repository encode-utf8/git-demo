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

/** 计算指数移动平均；数据不足返回 null。 */
function ema(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) {
    return null;
  }
  const factor = 2 / (period + 1);
  let current = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  for (let index = period; index < values.length; index += 1) {
    current = values[index] * factor + current * (1 - factor);
  }
  return current;
}

/** 计算 RSI（Wilder 平滑）。 */
function rsi(values: number[], period: number): number | null {
  if (values.length <= period) {
    return null;
  }
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
  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }
  return 100 - 100 / (1 + averageGain / averageLoss);
}

/** 计算标准差。 */
function standardDeviation(values: number[], period: number): number | null {
  if (values.length < period) {
    return null;
  }
  const slice = values.slice(-period);
  const average = slice.reduce((sum, value) => sum + value, 0) / period;
  const variance =
    slice.reduce((sum, value) => sum + (value - average) ** 2, 0) / period;
  return Math.sqrt(variance);
}

/** 由收盘价列表计算 MACD。 */
function macd(values: number[]): { dif: number | null; dea: number | null; histogram: number | null } {
  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);
  if (ema12 === null || ema26 === null) {
    return { dif: null, dea: null, histogram: null };
  }

  // 完整 EMA 序列用于 DEA；简化实现直接基于当前 DIF 做平滑会丢失部分精度，这里用 9 期近似。
  const difSeries: number[] = [];
  for (let index = 25; index < values.length; index += 1) {
    const currentEma12 = ema(values.slice(0, index + 1), 12);
    const currentEma26 = ema(values.slice(0, index + 1), 26);
    if (currentEma12 !== null && currentEma26 !== null) {
      difSeries.push(currentEma12 - currentEma26);
    }
  }
  const dif = difSeries.at(-1) ?? ema12 - ema26;
  const dea = ema(difSeries, 9) ?? dif;
  return {
    dif,
    dea,
    histogram: (dif - dea) * 2,
  };
}

/** 由 K 线计算完整技术指标。 */
export function calculateIndicators(
  klines: Kline[],
  code: string,
  period: KlinePeriod,
): TechnicalIndicators {
  const closes = klines.map((item) => item.close);
  const highs = klines.map((item) => item.high);
  const lows = klines.map((item) => item.low);

  let k: number | null = null;
  let d: number | null = null;
  let j: number | null = null;
  if (klines.length >= 9) {
    const periods = Math.min(9, klines.length);
    let previousK = 50;
    let previousD = 50;
    for (let index = periods - 1; index < klines.length; index += 1) {
      const lowest = Math.min(...lows.slice(index - periods + 1, index + 1));
      const highest = Math.max(...highs.slice(index - periods + 1, index + 1));
      const rsv = highest === lowest ? 50 : ((closes[index] - lowest) / (highest - lowest)) * 100;
      previousK = (2 / 3) * previousK + (1 / 3) * rsv;
      previousD = (2 / 3) * previousD + (1 / 3) * previousK;
    }
    k = previousK;
    d = previousD;
    j = 3 * previousK - 2 * previousD;
  }

  const middle = sma(closes, 20);
  const deviation = standardDeviation(closes, 20);

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
      k: k === null ? null : Number(k.toFixed(2)),
      d: d === null ? null : Number(d.toFixed(2)),
      j: j === null ? null : Number(j.toFixed(2)),
    },
    rsi: {
      rsi6: rsi(closes, 6),
      rsi12: rsi(closes, 12),
      rsi24: rsi(closes, 24),
    },
    boll: {
      upper: middle !== null && deviation !== null ? Number((middle + 2 * deviation).toFixed(2)) : null,
      middle: middle === null ? null : Number(middle.toFixed(2)),
      lower: middle !== null && deviation !== null ? Number((middle - 2 * deviation).toFixed(2)) : null,
    },
  };
}
