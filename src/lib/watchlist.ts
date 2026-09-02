// 自选股数据访问层：优先使用远程 PostgreSQL 的 watchlist 表，否则使用内存 stub。
// 代码校验与市场识别复用 lib/market，保持沪深北 A 股口径一致。
import { asc, eq } from "drizzle-orm";

import { getDb, hasRealDatabaseUrl, schema } from "@/lib/db";
import { detectExchange, normalizeStockCode, resolveStock } from "@/lib/market";
import type { WatchlistItem } from "@/lib/shared/types";

/** 自选股新增请求。 */
export interface WatchlistAddInput {
  code: string;
  note?: string | null;
}

/** 自选股备注更新请求。 */
export interface WatchlistNoteInput {
  code: string;
  note: string | null;
}

/** 自选股排序请求。 */
export interface WatchlistReorderInput {
  codes: string[];
}

/** 自选股仓储接口。 */
export interface WatchlistRepository {
  list(): Promise<WatchlistItem[]>;
  getByCode(code: string): Promise<WatchlistItem | null>;
  add(item: WatchlistItem): Promise<void>;
  remove(code: string): Promise<void>;
  updateNote(code: string, note: string | null): Promise<void>;
  reorder(codes: string[]): Promise<void>;
}

/** 将数据库行转换为共享自选股模型。 */
function mapRow(row: typeof schema.watchlist.$inferSelect): WatchlistItem {
  return {
    code: row.code,
    name: row.name,
    exchange: row.exchange,
    added_at: row.addedAt.toISOString(),
    sort_order: row.sortOrder,
    note: row.note,
  };
}

/** 深拷贝，避免外部修改污染内存数据。 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** 创建内存版自选股仓储。 */
function createMemoryWatchlistRepository(): WatchlistRepository {
  const items = new Map<string, WatchlistItem>();

  return {
    async list() {
      return Array.from(items.values())
        .sort(
          (a, b) =>
            a.sort_order - b.sort_order || a.added_at.localeCompare(b.added_at),
        )
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
    async updateNote(code, note) {
      const item = items.get(code);
      if (item) {
        items.set(code, { ...item, note });
      }
    },
    async reorder(codes) {
      const ordered = Array.from(items.values()).sort(
        (a, b) =>
          a.sort_order - b.sort_order || a.added_at.localeCompare(b.added_at),
      );
      const byCode = new Map(ordered.map((item) => [item.code, item]));
      let nextOrder = 0;

      for (const code of codes) {
        const item = byCode.get(code);
        if (item) {
          items.set(code, { ...item, sort_order: nextOrder });
          nextOrder += 1;
        }
      }

      for (const item of ordered) {
        if (!codes.includes(item.code)) {
          items.set(item.code, { ...item, sort_order: nextOrder });
          nextOrder += 1;
        }
      }
    },
  };
}

/** 创建远程 PostgreSQL 自选股仓储。 */
function createDrizzleWatchlistRepository(): WatchlistRepository {
  const db = getDb();

  return {
    async list() {
      const rows = await db
        .select()
        .from(schema.watchlist)
        .orderBy(asc(schema.watchlist.sortOrder), asc(schema.watchlist.addedAt));
      return rows.map(mapRow);
    },
    async getByCode(code) {
      const rows = await db
        .select()
        .from(schema.watchlist)
        .where(eq(schema.watchlist.code, code))
        .limit(1);
      const row = rows[0];
      return row ? mapRow(row) : null;
    },
    async add(item) {
      await db
        .insert(schema.watchlist)
        .values({
          code: item.code,
          name: item.name,
          exchange: item.exchange,
          sortOrder: item.sort_order,
          note: item.note,
          addedAt: new Date(item.added_at),
        })
        .onConflictDoUpdate({
          target: schema.watchlist.code,
          set: {
            name: item.name,
            exchange: item.exchange,
            sortOrder: item.sort_order,
            note: item.note,
          },
        });
    },
    async remove(code) {
      await db.delete(schema.watchlist).where(eq(schema.watchlist.code, code));
    },
    async updateNote(code, note) {
      await db
        .update(schema.watchlist)
        .set({ note })
        .where(eq(schema.watchlist.code, code));
    },
    async reorder(codes) {
      await Promise.all(
        codes.map((code, index) =>
          db
            .update(schema.watchlist)
            .set({ sortOrder: index })
            .where(eq(schema.watchlist.code, code)),
        ),
      );
    },
  };
}

/** 校验新增自选股输入并构建可持久化条目。 */
export function buildWatchlistItem(
  input: WatchlistAddInput,
): { item: WatchlistItem } | { error: string } {
  const code = normalizeStockCode(input.code);
  if (!code) {
    return { error: "请输入合法的沪深北 A 股 6 位代码。" };
  }

  const exchange = detectExchange(code);
  if (!exchange) {
    return { error: "暂不支持该市场，请输入沪深北 A 股代码。" };
  }

  const stock = resolveStock(code);
  const note =
    typeof input.note === "string" && input.note.trim()
      ? input.note.trim()
      : null;

  return {
    item: {
      code,
      name: stock.name,
      exchange,
      added_at: new Date().toISOString(),
      sort_order: 0,
      note,
    },
  };
}

/** 默认自选股仓储单例，供 API 路由统一使用。 */
export const watchlistRepository: WatchlistRepository = hasRealDatabaseUrl()
  ? createDrizzleWatchlistRepository()
  : createMemoryWatchlistRepository();
