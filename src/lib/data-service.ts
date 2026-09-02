// FastAPI 行情侧车客户端：失败时回退确定性数据，保证单机可运行。
import { recordExternalCall } from "@/lib/observability";
import type {
  AdjustType,
  Kline,
  KlinePeriod,
  MarketQuote,
} from "@/lib/shared/types";

const DEFAULT_DATA_SERVICE_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 12000;
const QUOTE_TIMEOUT_MS = 10000;
const KLINE_TIMEOUT_MS = 20000;

/** 获取侧车地址，读取环境变量或使用默认值。 */
function dataServiceUrl(): string {
  return (process.env.DATA_SERVICE_URL ?? DEFAULT_DATA_SERVICE_URL).replace(/\/$/, "");
}

/** 带超时的 JSON 请求。 */
async function fetchJson<T>(path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${dataServiceUrl()}${path}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`行情侧车响应异常：${response.status}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** 校验侧车返回的行情结构是否可用。 */
function isQuote(value: unknown): value is MarketQuote {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Partial<MarketQuote>;
  return (
    typeof item.code === "string" &&
    typeof item.price === "number" &&
    typeof item.source === "string" &&
    typeof item.fetched_at === "string"
  );
}

/** 校验侧车返回的 K 线结构是否可用。 */
function isKlineList(value: unknown): value is Kline[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const kline = item as Partial<Kline>;
    return (
      typeof kline.code === "string" &&
      typeof kline.ts === "string" &&
      typeof kline.close === "number"
    );
  });
}

/** 从行情侧车获取当前行情；不可用时返回 null。 */
export async function fetchQuoteFromSidecar(code: string): Promise<MarketQuote | null> {
  try {
    const data = await fetchJson<MarketQuote>(
      `/quote?code=${encodeURIComponent(code)}`,
      QUOTE_TIMEOUT_MS,
    );
    recordExternalCall(true);
    return isQuote(data) ? data : null;
  } catch {
    recordExternalCall(false);
    return null;
  }
}

/** 从行情侧车获取 K 线；不可用时返回 null。 */
export async function fetchKlinesFromSidecar(
  code: string,
  period: KlinePeriod,
  adjust: AdjustType,
  limit: number,
): Promise<Kline[] | null> {
  try {
    const params = new URLSearchParams({
      code,
      period,
      adjust,
      limit: String(limit),
    });
    const data = await fetchJson<Kline[]>(
      `/kline?${params.toString()}`,
      KLINE_TIMEOUT_MS,
    );
    recordExternalCall(true);
    return isKlineList(data) ? data : null;
  } catch {
    recordExternalCall(false);
    return null;
  }
}
