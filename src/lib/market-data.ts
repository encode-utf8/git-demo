// 行情读取编排：缓存命中优先，其次内存 store，再次行情侧车，最后确定性回退。
import { cacheGetOrSet, cacheInvalidatePrefix } from "@/lib/cache";
import { fetchKlinesFromSidecar, fetchQuoteFromSidecar } from "@/lib/data-service";
import {
  buildDeterministicKlines,
  buildDeterministicQuote,
} from "@/lib/deterministic";
import { calculateIndicators } from "@/lib/indicators";
import { resolveStock } from "@/lib/market";
import { store } from "@/lib/store";
import type {
  AdjustType,
  Kline,
  KlinePeriod,
  MarketQuote,
  Stock,
  TechnicalIndicators,
} from "@/lib/shared/types";

const QUOTE_TTL_MS = 60_000;
const MINUTE_KLINE_TTL_MS = 60_000;
const DAY_KLINE_TTL_MS = 6 * 60 * 60_000;
const WEEK_KLINE_TTL_MS = 12 * 60 * 60_000;
const MONTH_KLINE_TTL_MS = 24 * 60 * 60_000;
const INDICATOR_TTL_MS = 60_000;

/** 判断数据是否在允许的新鲜度窗口内。 */
function isFresh(timestamp: string, ttlMs: number): boolean {
  const age = Date.now() - new Date(timestamp).getTime();
  return Number.isFinite(age) && age >= 0 && age <= ttlMs;
}

/** 获取并持久化股票元数据。 */
export async function getStock(code: string): Promise<Stock> {
  const cached = await store.stocks.getByCode(code);
  if (cached) {
    return cached;
  }
  const stock = resolveStock(code);
  await store.stocks.upsert(stock);
  return stock;
}

/** 获取当前行情快照。 */
export async function getMarketQuote(code: string, forceRefresh = false): Promise<MarketQuote> {
  const cacheKey = `quote:${code}`;
  if (forceRefresh) {
    cacheInvalidatePrefix(cacheKey);
  }

  return cacheGetOrSet(cacheKey, QUOTE_TTL_MS, async () => {
    await getStock(code);

    if (!forceRefresh) {
      const saved = await store.marketQuotes.getLatest(code);
      if (
        saved &&
        saved.source !== "deterministic-fallback" &&
        isFresh(saved.fetched_at, QUOTE_TTL_MS)
      ) {
        return saved;
      }
    }

    const sidecarQuote = await fetchQuoteFromSidecar(code);
    const quote = sidecarQuote ?? buildDeterministicQuote(code);
    await store.marketQuotes.insert(quote);
    return quote;
  });
}

/** 获取 K 线数据。 */
export async function getKlines(
  code: string,
  period: KlinePeriod,
  adjust: AdjustType,
  limit: number,
  forceRefresh = false,
): Promise<Kline[]> {
  // TODO: 共享 Kline 类型暂无 source/fetched_at；如需独立 K 线溯源，在本模块新增本地包装类型。
  const cacheKey = `kline:${code}:${period}:${adjust}:${limit}`;
  if (forceRefresh) {
    cacheInvalidatePrefix(`kline:${code}`);
  }

  const ttlMs =
    period === "minute"
      ? MINUTE_KLINE_TTL_MS
      : period === "day"
        ? DAY_KLINE_TTL_MS
        : period === "week"
          ? WEEK_KLINE_TTL_MS
          : MONTH_KLINE_TTL_MS;

  return cacheGetOrSet(cacheKey, ttlMs, async () => {
    if (!forceRefresh) {
      const saved = await store.klines.list(code, period, adjust, limit);
      if (
        saved.length > 0 &&
        saved.every((item) => item.source !== "deterministic-fallback") &&
        saved.every(
          (item) => typeof item.fetched_at === "string" && isFresh(item.fetched_at, ttlMs),
        )
      ) {
        return saved;
      }
    }

    const sidecarKlines = await fetchKlinesFromSidecar(code, period, adjust, limit);
    const klines = sidecarKlines ?? buildDeterministicKlines(code, period, adjust, limit);
    await store.klines.insertMany(klines);
    return klines.slice(-limit);
  });
}

/** 获取本地计算的技术指标。 */
export async function getIndicators(
  code: string,
  period: KlinePeriod,
): Promise<TechnicalIndicators> {
  const cacheKey = `indicators:${code}:${period}`;
  return cacheGetOrSet(cacheKey, INDICATOR_TTL_MS, async () => {
    const klines = await getKlines(code, period, "qfq", 120);
    return calculateIndicators(klines, code, period);
  });
}

/** 强制刷新行情与 K 线缓存。 */
export async function refreshMarketData(code: string): Promise<void> {
  await getMarketQuote(code, true);
  await getKlines(code, "day", "qfq", 120, true);
}
