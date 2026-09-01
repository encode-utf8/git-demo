# 个股盘面分析网站

本地运行的个股盘面分析与 AI 学习工具。支持 A 股代码查询、行情/K 线/技术指标、资讯分析报告、多轮对话与历史回看。

## 当前能力

- 盘面：股票代码校验与市场识别、行情快照、分时/日/周/月 K 线、MA/MACD/KDJ/RSI/BOLL。
- 分析：资讯抓取与去重、利好/利空/中性分类、影响周期、教学式报告与风险提示。
- 对话：SSE 流式输出、多轮上下文、工具调用与来源引用。
- 持久化与清理：TTL 缓存复用、资讯软删除、任务日志与可观测性指标。
- 降级：未配置外部密钥时自动使用确定性演示数据，并明确标注来源与更新时间。

## 技术栈

- Web/Agent：Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui
- 行情侧车：Python 3.12 + FastAPI
- 数据库：Drizzle ORM + Supabase/Neon PostgreSQL
- 包管理：Node 20+，pnpm

## 环境准备

```bash
cp .env.example .env
corepack enable
corepack pnpm install
```

## 启动

```bash
# Web（http://127.0.0.1:3000）
corepack pnpm dev

# 行情侧车（http://127.0.0.1:8000）
python -m uvicorn app.main:app --app-dir data-service --host 127.0.0.1 --port 8000
```

健康检查：

- `GET http://127.0.0.1:3000/api/health`
- `GET http://127.0.0.1:8000/health`

## 常用命令

- `corepack pnpm typecheck`：TypeScript 类型检查
- `corepack pnpm lint`：ESLint
- `corepack pnpm dev`：启动 Web 开发服务

## 免责声明

本项目仅供学习参考，不构成投资建议。所有行情、资讯与 AI 输出均可能存在延迟或误差，请独立判断并自行承担盈亏。
