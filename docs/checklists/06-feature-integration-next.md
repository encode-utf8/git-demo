# feature/integration-next 集成与整体验收清单

- 分支：`feature/integration-next`
- 目标：串通真实行情、AI 分析、对话助手、定时清理与可观测性全链路
- 完成日期：2026-09-02

## 验收项

- [x] 已从 `main` 创建 `feature/integration-next`，未直接在 `main` 上开发
- [x] 已合并 `feature/real-market-data`
- [x] 已合并 `feature/llm-analysis`（已包含于 `feature/llm-chat`）
- [x] 已合并 `feature/llm-chat`
- [x] 已合并 `feature/scheduler-observability`
- [x] M1 盘面展示：600519、000001、830799 三市场行情/K 线/指标正常
- [x] M2 AI 资讯与分析：真实 Tavily/DeepSeek 链路可用，报告含来源、影响周期与风险提示
- [x] M3 对话助手：SSE 流式输出、meta/conversationId 回传、多轮上下文可用
- [x] M4 持久化与清理：可观测性指标、手动刷新与清理任务写入 `job_runs`
- [x] M5 学习体验：数据来源、新鲜度、风险提示与免责声明已展示
- [x] 真实密钥模式：AkShare/Tavily/DeepSeek/R2 链路验证通过
- [x] 演示降级模式：无密钥时行情/资讯/分析/对话自动降级并明确标注
- [x] 修复跨模块接口不一致：K 线溯源字段、会话 meta 事件、真实/演示资讯隔离
- [x] `corepack pnpm typecheck` 通过
- [x] `corepack pnpm lint` 通过
- [x] `corepack pnpm build` 通过
- [x] 未提交任何真实密钥，仅保留 `.env.example`

## 集成修复记录

- `data-service/app/main.py`：AkShare/Tencent K 线按日期去重，修正确定性 K 线漂移。
- `src/lib/shared/types/models.ts`：`Kline` 增加可选 `source`/`fetched_at`，用于新鲜度判断。
- `src/lib/db/schema.ts` + `drizzle/0001_cooing_zuras.sql`：`klines` 增加溯源列，`observability_metrics` 纳入迁移。
- `src/lib/market-data.ts`：旧数据或缺失溯源时不再复用脏 K 线，改为重新拉取真实侧车。
- `src/lib/news.ts`：过滤过期资讯，并在真实 Tavily 模式下隔离演示资讯。
- `src/lib/chat.ts`：流式开始即回传 `meta` 会话 ID，修复多轮追问丢失上下文；兜底文案不称“真实行情”。
- `src/lib/store/index.ts` + `src/lib/db/index.ts` + `src/lib/observability.ts`：仅远程真实数据库才启用 Drizzle，本地占位配置自动降级内存存储。
- `eslint.config.mjs`：忽略 `**/.venv/**`，避免扫描 Python 侧车依赖脚本。

## 主控合并说明

本分支已自检通过，等待主控合并到 `main`；请勿在本次任务中自行合并 `main`。
