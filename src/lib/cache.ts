// 进程内 TTL 缓存：按文档分级 TTL，未命中调用 loader 并回写。
import {
  recordCacheHit,
  recordCacheMiss,
} from "@/lib/observability";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

/** 读取未过期缓存。 */
export function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    recordCacheMiss();
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    recordCacheMiss();
    return null;
  }

  recordCacheHit();
  return entry.value;
}

/** 写入缓存。 */
export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

/** 按前缀清理缓存，供强制刷新使用。 */
export function cacheInvalidatePrefix(prefix: string): number {
  let removed = 0;
  for (const key of Array.from(cache.keys())) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/**
 * 读取或加载缓存。
 * 命中时直接返回；未命中时执行 loader 并回写。
 */
export async function cacheGetOrSet<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  cacheSet(key, value, ttlMs);
  return value;
}
