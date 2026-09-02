// 自选股内存版 stub：后续 watchlist 分支接入 Drizzle 持久化时必须保持接口签名不变。

import type { WatchlistItem } from "@/lib/shared/types";

/** 自选股仓库接口。 */
export interface WatchlistRepository {
  list(): Promise<WatchlistItem[]>;
  getByCode(code: string): Promise<WatchlistItem | null>;
  add(item: WatchlistItem): Promise<void>;
  remove(code: string): Promise<void>;
}

/** 深拷贝辅助函数，避免外部修改污染内存数据。 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 创建独立的自选股内存版 store。 */
export function createMemoryWatchlistStore(): WatchlistRepository {
  const items = new Map<string, WatchlistItem>();

  return {
    async list() {
      return Array.from(items.values())
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => clone(item));
    },
    async getByCode(code) {
      const item = items.get(code);
      return item ? clone(item) : null;
    },
    async add(item) {
      items.set(item.code, clone(item));
    },
    async remove(code) {
      items.delete(code);
    },
  };
}

/** 默认自选股内存 store 单例，供后续 API 路由与功能分支使用。 */
export const watchlistStore: WatchlistRepository = createMemoryWatchlistStore();
