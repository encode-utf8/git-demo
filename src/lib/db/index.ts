// Drizzle 数据库客户端：仅在需要真实持久化时初始化。
// 当前阶段统一使用 lib/store 的内存 stub，避免未配置数据库时启动失败。
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let dbInstance: ReturnType<typeof createDb> | null = null;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("缺少 DATABASE_URL，请复制 .env.example 为 .env 并填写配置。");
  }
  const client = postgres(url, { max: 1 });
  return drizzle(client, { schema });
}

/** 获取数据库客户端；未配置时会抛出明确错误。 */
export function getDb(): ReturnType<typeof createDb> {
  dbInstance ??= createDb();
  return dbInstance;
}

export * as schema from "./schema";
