# 个股盘面分析网站 并行开发计划

- 文档版本：v1.0
- 编制日期：2026-08-31
- 关联文档：`spec.md`、`design.md`、`plan.md`
- 用途：指导多个 Codex agent 在独立分支/worktree 中并行开发，避免文件冲突。

---

## 1. 现状判断

- 初始基线：仓库当时只有 `docs/spec.md`、`docs/design.md`、`docs/plan.md`，尚无业务代码。
- 当前状态：P1–P6 已全部完成并合并到 `main`，M1–M5 验收通过；本文档中的 Agent 0–E 已执行完毕。
- P7 后续迭代：M6-M8 已完成并合并到 `main`，验收记录见 `docs/checklists/07-feature-datasource-scheduler-dashboard.md`、`docs/checklists/08-feature-p7-integration.md`。
- 根目录曾存在一个多余文件 `demo copy.ts`，已在工程初始化阶段清理。
- 后续开发编排、Agent 提示词与 worktree 命令见 `docs/next-phase-dev-plan.md`。

---

## 2. 并行策略

| 波次 | 模式 | Agent | 分支 | 负责范围 |
| --- | --- | --- | --- | --- |
| 0 | 串行 | Agent 0 | `feature/scaffold` | 工程骨架 + 共享类型 + 接口契约 |
| 1 | 并行 | Agent A | `feature/quote-kline` | 盘面展示 + 行情侧车（M1） |
| 1 | 并行 | Agent B | `feature/ai-analysis` | AI 资讯与分析（M2） |
| 1 | 并行 | Agent C | `feature/chat-assistant` | 对话助手（M3） |
| 1 | 并行 | Agent D | `feature/persistence-cleanup` | 持久化、缓存与清理（M4） |
| 2 | 串行 | Agent E | `feature/integration-polish` | 集成联调 + M1–M5 验收（M5） |

关键点：`docs/plan.md` 中 P3 依赖 P2、P4 依赖 P3。要让 A/B/C/D 并行，第 0 波必须先把
`docs/design.md` 第 6 节数据模型、第 7 节接口全部冻结为共享类型与 mock 接口骨架，各 agent
按契约开发、用 mock 数据自测，最后在第 2 波联调。

---

## 3. Worktree 操作

第 0 波合并到 `main` 后，再为第 1 波创建隔离工作树：

```bash
git worktree add ../demo-quote        -b feature/quote-kline
git worktree add ../demo-analysis     -b feature/ai-analysis
git worktree add ../demo-chat         -b feature/chat-assistant
git worktree add ../demo-persistence  -b feature/persistence-cleanup
```

- 每个 worktree 用独立 VS Code 窗口打开，各启动一个 Codex 会话。
- 每个 agent 只在自己的分支/目录中修改，完成后自测再合并回 `main`。
- 合并顺序：A/B/C/D 各自通过验收后合并，最后做 Agent E 集成。

---

## 4. 各 Agent 提示词

### Agent 0：工程底座

```
你是本项目基础工程搭建 agent。仓库当前只有 docs/ 文档，请完成 P1 工程初始化并冻结所有并行开发的接口契约。

工作目录：仓库根目录。分支：feature/scaffold（从 main 创建）。
技术栈：Next.js App Router + TypeScript + Tailwind + shadcn/ui；Node 20+，pnpm；
Python 3.12 + FastAPI 行情侧车；Drizzle ORM + Supabase/Neon；密钥走 .env。

必须交付：
1. 顶层结构：Next 应用 + data-service/ Python 侧车（侧车先只做 /health，不写 AkShare 业务）。
2. 共享类型：按 docs/design.md 第 6 节数据模型定义 stocks、market_quotes、klines、
   news_items、analysis_reports、conversations、messages、job_runs，并定义统一 API 响应/错误类型。
3. 接口骨架：按 docs/design.md 第 7 节所有路由建好，先用 mock 数据返回，路径和签名冻结。
4. Drizzle schema 与迁移配置（对应第 6 节），先不执行线上迁移。
5. .env.example（DeepSeek、Tavily、Supabase、R2 占位），确认 .env 在 .gitignore。
6. dev 脚本与 /api/health、/health 健康检查；删除或忽略根目录的 demo copy.ts。
7. 为 lib/store 提供一个内存版 stub，保证后续各分支不接数据库也能编译运行。

约束：代码注释与提交信息用中文；不写业务逻辑；不提交真实密钥；不触碰 AkShare 具体实现。
验收：pnpm dev 与 data-service 均能启动；两个 health 接口返回 200；pnpm typecheck 通过；
.env.example 存在且无密钥。
完成后：运行 typecheck 与健康检查，报告目录结构和冻结的接口清单，等待合并到 main。
```

### Agent A：盘面展示 + 行情侧车

```
你是“盘面展示 + 行情数据侧车”开发 agent，负责里程碑 M1。

分支：feature/quote-kline。只修改 data-service/、行情/K线/指标相关 API 路由、盘面页面与组件、
lib/indicators。禁止改 lib/store、lib/search、lib/agent/chat、lib/scheduler，禁止改共享已冻结类型
（如需新类型先放本模块并注明 TODO）。

目标：
1. Python FastAPI + AkShare 输出标准化 JSON：quote（现价、涨跌幅、开高低收、量额、换手率、
   PE/PB、市值等）、kline（分时/日/周/月、复权参数）、fundamental/moneyflow 按需。
2. TS 侧实现 GET /api/stocks/:code/quote、GET /api/stocks/:code/kline?period=&adjust=、
   GET /api/stocks/:code/indicators，失败重试并降级提示。
3. lib/indicators 本地计算 MA、MACD、KDJ、RSI、BOLL。
4. 盘面页面：股票代码输入/校验/市场识别、行情快照、K 线图（klinecharts 或 lightweight-charts）、
   指标图（ECharts）、异常时显示更新时间与降级提示。

验收（M1）：至少 3 只不同市场股票查询正常，数据与公开行情一致，指标正确，界面无报错。
约束：中文注释；密钥只写 .env；不提交密钥；保持 frozen API 契约一致。
完成后：自测 3 只股票，运行 typecheck，报告接口样例与验收结果，等待合并。
```

### Agent B：AI 资讯与分析

```
你是“AI 资讯与分析”开发 agent，负责里程碑 M2。

分支：feature/ai-analysis。只修改 lib/search、lib/agent/analysis、分析报告相关路由/页面/组件，
并只读使用 store 接口。禁止改 data-service、chat、scheduler、cache 与共享类型。

目标：
1. lib/search 封装 Tavily，按股票代码+名称抓资讯。
2. 资讯去重（URL 或 标题+来源+发布时间 哈希）、利好/利空/中性分类、置信度、impact_days 判定。
3. DeepSeek（OpenAI 兼容接口）LangGraph.js 工作流：规划→并行取行情+资讯→分类→数据面/消息面/
   情绪面分析→教学讲解→风险提示→落库；强制引用来源，禁止“必涨/必跌”。
4. 实现 POST /api/stocks/:code/analysis、GET /api/stocks/:code/news、
   GET /api/stocks/:code/reports，报告落库并展示。

依赖：行情接口由 feature/quote-kline 提供，本阶段先用契约 mock 数据开发，联调放集成阶段。
验收（M2）：报告含来源、影响周期、风险提示；不输出确定性收益承诺；引用可追溯。
约束：中文注释；密钥只写 .env；不提交密钥；impact_days 异常值回退默认（短期 7、长期 30）。
完成后：用 1 只股票走通分析流程，运行 typecheck，报告样例与验收结果，等待合并。
```

### Agent C：对话助手

```
你是“对话助手”开发 agent，负责里程碑 M3。

分支：feature/chat-assistant。只修改 lib/agent/chat、chat 相关路由/页面/组件，以及
conversations/messages 的 store 使用。禁止改 data-service、search、scheduler、cache 与共享类型。

目标：
1. 类 ChatGPT 聊天界面，流式输出。
2. POST /api/chat（SSE）流式对话；多轮上下文取会话 messages。
3. 工具调用：get_quote/get_kline/get_indicators/search_news/get_report/save_report，
   只读调用其他模块暴露的接口，不修改它们。
4. 对话记录持久化：conversations、messages 走 store 接口（具体实现由
   feature/persistence-cleanup 提供，本阶段用内存 stub）。
5. 护栏：必须引用来源、禁止“必涨/必跌”、回答附风险提示。

依赖：行情/资讯/报告接口与工具由其他分支提供，按 frozen 契约 + mock 开发。
验收（M3）：连续 3 轮以上追问上下文正确，回答可追溯引用数据，流式输出正常。
约束：中文注释；密钥只写 .env；不提交密钥。
完成后：自测 3 轮多轮对话，运行 typecheck，报告结果，等待合并。
```

### Agent D：持久化、缓存与清理

```
你是“持久化、缓存与清理”开发 agent，负责里程碑 M4 与 store 具体实现。

分支：feature/persistence-cleanup。只修改 lib/store、lib/cache、lib/scheduler、admin 路由、
可观测性相关文件。禁止改 data-service、search、analysis、chat 页面逻辑与共享类型。

目标：
1. lib/store：Drizzle + Supabase/Neon 实现 stocks、market_quotes、klines、news_items、
   analysis_reports、conversations、messages、job_runs 读写；R2 存资讯原文/快照；
   保持 scaffold 冻结的接口签名不变。
2. lib/cache：TTL 分级缓存（当前行情 1–5 分钟、日 K 按交易日、财务按披露周期、报告按资讯时效）；
   未命中请求源并回写，失败不覆盖有效数据。
3. node-cron：每日清理 expire_at < now 且非 pinned 的资讯（软删除），长期消息保留；写 job_runs 日志。
4. POST /api/admin/refresh、POST /api/admin/cleanup；配额/调用统计与降级提示。

验收（M4）：同代码第二次查询明显减少外部调用；本地磁盘占用可控；清理日志可查。
约束：中文注释；密钥只写 .env；不提交密钥；不破坏其他模块依赖的 store 接口。
完成后：运行一次迁移与清理任务，验证日志，运行 typecheck，报告结果，等待合并。
```

### Agent E：集成与整体验收

```
你是“集成与整体验收” agent，负责 M5 与最终交付。

前置：feature/quote-kline、feature/ai-analysis、feature/chat-assistant、
feature/persistence-cleanup 已合并到集成分支。

分支：feature/integration-polish（基于集成分支）。以集成修复为主，不新增大功能。

目标：
1. 串通盘面→分析→对话→持久化/清理全链路联调。
2. 历史分析与对话时间线回看；风险提示、免责声明、数据更新时间与新鲜度展示。
3. 可观测性：外部调用次数、失败率、缓存复用命中率。
4. 跑通 docs/plan.md 的 M1–M5 全部验收，修复跨模块接口不一致与缺陷。

验收（M5）：M1–M5 全部通过，界面标注数据时间与免责声明，全链路无报错。
约束：中文注释；密钥只写 .env；不提交密钥。
完成后：给出完整验收清单与结果，输出最终 MVP。
```

---

## 5. 验收清单索引

每个分支对应一份独立验收清单，见 `docs/checklists/`：

- `00-feature-scaffold.md`
- `01-feature-quote-kline.md`
- `02-feature-ai-analysis.md`
- `03-feature-chat-assistant.md`
- `04-feature-persistence-cleanup.md`
- `05-feature-integration-polish.md`

---

## 6. 协作约定

- 每个 agent 只在自己的 worktree/分支开发，合并前自测验收。
- 代码注释与提交信息使用中文。
- API Key 等敏感信息只写本地 `.env`，不提交仓库；仓库只提交 `.env.example`。
- 共享类型与 store 接口在 scaffold 冻结后，非集成阶段不得修改；如需扩展先本地标注 TODO。
