# 个股盘面分析网站

本地运行的个股盘面分析与 AI 学习工具。当前分支为 P1 工程初始化底座。

## 技术栈

- Web/Agent：Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui
- 行情侧车：Python 3.12 + FastAPI
- 数据库：Drizzle ORM + Supabase/Neon PostgreSQL
- 对象存储：Cloudflare R2
- 包管理：Node 20+，pnpm

## 目录结构

- `src/app`：Next.js 页面与 API Route
- `src/lib/shared`：冻结的共享类型与统一 API 响应/错误类型
- `src/lib/store`：数据访问接口与内存版 stub
- `src/lib/db`：Drizzle schema 与数据库客户端
- `src/lib/mock`：mock 数据
- `data-service/`：FastAPI 行情侧车（当前仅 `/health`）
- `drizzle/`：迁移文件输出目录（本阶段不执行线上迁移）

## 环境准备

1. 复制环境变量模板：

```bash
cp .env.example .env
```

2. 创建行情侧车专属 conda 环境：

```bash
conda env create -n stock-analysis -f data-service/environment.yml
conda activate stock-analysis
```

3. 安装 Node 依赖：

```bash
corepack enable
pnpm install
```

## 启动

```bash
# Web（http://127.0.0.1:3000）
pnpm dev

# 行情侧车（http://127.0.0.1:8000）
pnpm dev:data

# 同时启动
pnpm dev:all
```

健康检查：

- `GET http://127.0.0.1:3000/api/health`
- `GET http://127.0.0.1:8000/health`

## 常用命令

- `pnpm typecheck`：TypeScript 类型检查
- `pnpm lint`：ESLint
- `pnpm db:generate`：生成本地 Drizzle 迁移文件
- `pnpm db:migrate`：执行迁移（需先配置 `DATABASE_URL`，P1 不执行）

## 契约冻结

`docs/design.md` 第 6 节数据模型与第 7 节接口已在 `src/lib/shared` 和
`src/app/api` 中冻结；后续分支按契约开发，集成阶段统一联调。
