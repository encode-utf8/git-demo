import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Drizzle 迁移配置：仅用于本地生成/检查迁移文件，不在此阶段执行线上迁移。
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
});
