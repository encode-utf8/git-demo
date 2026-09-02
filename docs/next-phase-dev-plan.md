# 个股盘面分析网站 下一阶段开发计划

- 文档版本：v0.1
- 编制日期：2026-09-02
- 关联文档：`docs/plan.md`、`docs/design.md`、`docs/parallel-dev-plan.md`
- 用途：定义 MVP 之后的串行/并行 agent 工作流、分支、验收里程碑与 worktree 命令。

---

## 1. 当前基线

- P0–P6 / M1–M5 已完成并合并到 `main`，工作区干净。
- `src/app/page.tsx` 已拆分为 10 个 panel 组件。
- `src/lib/shared/types/next-phase.ts` 已冻结 `DataSourceStatus`、`SchedulerJob`、`ChatStreamEvent` 契约。
- 其中 `ChatStreamEvent` 已使用；`DataSourceStatus`、`SchedulerJob` 尚未接入 API/UI。
- 本阶段只在冻结契约基础上做增量开发，不破坏既有 MVP。

## 2. 候选功能与优先级

| 编号 | 功能 | 里程碑 | 优先级 | 依赖 | 建议 |
| --- | --- | --- | --- | --- | --- |
| N1 | 自选股池与多股票切换 | M6 | 高 | N0 | 并行开发 |
| N2 | 历史复盘与命中率统计（仅学习） | M7 | 中 | N0 | 并行开发 |
| N3 | 数据源健康与调度面板 | M8 | 高 | N0 | 并行开发 |
| N4 | 集成与整体验收 | M6–M8 | 高 | N1+N2+N3 | 串行收口 |
| N5 | 港股/美股与多语言资讯 | M9 | 低 | 另行评估 | 后续串行 |
| N6 | 情绪指标与策略回测（仅学习） | M10 | 低 | 另行评估 | 后续串行 |

## 3. 串行 + 并行工作流

### 第 0 波：串行，冻结契约与公共底座

- Agent N0：`feature/p7-base`
- 目的：新增共享类型、数据库迁移、空 panel 与 mock 路由，避免后续三个 agent 互相踩文件。
- 验收：`corepack pnpm typecheck`、`lint`、`build` 通过；三个空 panel 可在页面渲染；共享契约冻结。

### 第 1 波：并行，三个独立功能

- Agent N1：`feature/p7-watchlist`
- Agent N2：`feature/p7-replay`
- Agent N3：`feature/p7-datasource-scheduler-dashboard`
- 三者只修改各自模块与 N0 预建的空 panel，不修改 `page.tsx` 主容器，避免冲突。

### 第 2 波：串行，集成与验收

- Agent N4：`feature/p7-integration`
- 合并 N1/N2/N3 到集成分支，修复跨模块不一致，跑通 M6–M8。

## 4. 并行开发前 worktree 命令

以下命令在 Windows PowerShell 中执行；每个 worktree 用独立 VS Code 窗口与 Codex 会话打开。

```powershell
# 第 0 波：先创建串行底座
git checkout main
git pull
git worktree add ../demo-p7-base -b feature/p7-base
Set-Location ../demo-p7-base
corepack pnpm install
```

```powershell
# N0 验收并合并回 main 后，再创建三个并行 worktree
git checkout main
git pull
git worktree add ../demo-p7-watchlist -b feature/p7-watchlist
git worktree add ../demo-p7-replay -b feature/p7-replay
git worktree add ../demo-p7-datasource -b feature/p7-datasource-scheduler-dashboard
```

```powershell
# 第 2 波：三个功能合并回 main 后，创建集成 worktree
git checkout main
git pull
git worktree add ../demo-p7-integration -b feature/p7-integration
```

## 5. 各 Agent 提示词

每个提示词第一行必须写明“工作分支”。统一字段包括：工作分支、工作目录、基线、目标、
允许修改范围、禁止修改、交付物、验收标准、验证命令、约束、完成后报告。

### Agent N0：下一阶段公共底座

```
工作分支：feature/p7-base

工作目录：仓库根目录。
基线：从最新 main 创建分支，基于当前已合并的 MVP 与 next-phase 契约。
角色：你是“下一阶段公共底座”开发 agent，请为后续三个并行功能冻结契约并准备最小可运行骨架。

目标：
1. 在 src/lib/shared/types/ 新增 p7.ts，冻结以下类型（只新增，不修改既有字段）：
   - WatchlistItem：code、name、exchange、added_at、sort_order、note。
   - ReplaySummary：code、period_start、period_end、total_analysis、total_chats、
     positive_hits、negative_hits、neutral_hits、hit_rate、sample_size、generated_at。
   - 复用已有 DataSourceStatus、SchedulerJob；如需扩展，保持向后兼容。
2. Drizzle schema 新增 watchlist 表（code 主键，name/exchange/sort_order/note/added_at），
   生成对应 migration，不在本阶段执行线上迁移。
3. 为三个功能预建空 panel：WatchlistPanel.tsx、ReplayPanel.tsx、DataSourcePanel.tsx，
   并在 page.tsx 中占位渲染；主容器不承载业务逻辑。
4. 建立 mock 路由骨架：GET/POST/DELETE /api/watchlist、GET /api/replay/stats、
   GET /api/admin/datasources，统一使用 ApiResponse 包装，先返回空数据。
5. 在 lib/store 中为 watchlist 提供内存版 stub，并保持既有 store 接口签名不变。

允许修改范围：src/lib/shared/types/p7.ts、src/lib/db/schema.ts、drizzle/、
src/app/api/watchlist/、src/app/api/replay/、src/app/api/admin/datasources/、
src/components/panels/WatchlistPanel.tsx、ReplayPanel.tsx、DataSourcePanel.tsx、
src/app/page.tsx 的占位渲染、src/lib/store/ 的 watchlist stub。

禁止修改：data-service/、src/lib/chat.ts、src/lib/analysis.ts、src/lib/news.ts、
src/lib/scheduler.ts、src/lib/market-data.ts 的既有业务逻辑；不得提交真实密钥。

交付物：冻结类型与路由清单、watchlist migration、三个空 panel、统一 mock 响应、store stub。

验收标准：
- corepack pnpm typecheck、lint、build 均通过；
- 三个空 panel 可见；
- 新增 mock 路由返回统一成功结构；
- Drizzle migration 文件生成；
- 既有 M1–M5 无回归。

验证命令：corepack pnpm typecheck；corepack pnpm lint；corepack pnpm build。
约束：代码注释与提交信息使用中文；API Key 只写本地 .env；不提交真实密钥。
完成后报告：冻结的类型与路由清单、验证结果、修改文件列表，等待合并到 main。
```

### Agent N1：自选股池与多股票切换

```
工作分支：feature/p7-watchlist

工作目录：仓库根目录。
基线：基于已合并 feature/p7-base 的最新 main 创建。
角色：你是“自选股池与多股票切换”开发 agent，负责里程碑 M6。

目标：
1. 支持添加、删除、排序、备注自选股；校验沪深北 A 股代码与市场识别。
2. 点击自选股切换当前股票，并联动盘面、资讯、分析、对话上下文。
3. 持久化：远程数据库用 watchlist 表，本地占位配置用内存 stub；刷新页面可恢复。
4. UI：展示自选列表、当前选中状态、添加/删除/排序操作与错误提示。

允许修改范围：src/lib/watchlist.ts、src/app/api/watchlist/、
src/components/panels/WatchlistPanel.tsx，以及只读调用既有行情/分析/对话接口。

禁止修改：data-service/、src/lib/chat.ts、src/lib/analysis.ts、src/lib/news.ts、
src/lib/scheduler.ts、src/lib/market-data.ts、src/app/page.tsx 主容器；不得提交真实密钥。

交付物：自选股 CRUD、多股票切换联动、watchlist 持久化、WatchlistPanel 完成版。

验收标准（M6）：
- 添加、删除、切换 3 只以上自选股正常；
- 切换后盘面与分析报告对应股票正确；
- 刷新页面后自选股仍存在；
- corepack pnpm typecheck、lint 通过。

验证命令：corepack pnpm typecheck；corepack pnpm lint；手动验证自选股切换流程。
约束：代码注释与提交信息使用中文；密钥只写 .env；不提交密钥；不改共享类型语义。
完成后报告：自测 3 只自选股切换流程、验证结果、修改文件列表，等待合并。
```

### Agent N2：历史复盘与命中率统计

```
工作分支：feature/p7-replay

工作目录：仓库根目录。
基线：基于已合并 feature/p7-base 的最新 main 创建。
角色：你是“历史复盘与命中率统计”开发 agent，负责里程碑 M7。该功能仅用于学习，不得承诺收益。

目标：
1. 汇总某股票时间段内的分析次数、对话次数、利好/利空/中性资讯数量。
2. 计算命中率与样本量，明确展示统计口径、时间范围与“仅供学习”提示。
3. 支持按股票和最近 N 天筛选，展示历史分析与对话的时间线回看。
4. 所有派生统计不写入核心业务表；如确需持久化，只允许写入新的 replay 相关表。

允许修改范围：src/lib/replay.ts、src/app/api/replay/、
src/components/panels/ReplayPanel.tsx；只读访问既有 analysis_reports、conversations、messages、news_items。

禁止修改：data-service/、src/lib/chat.ts、src/lib/analysis.ts、src/lib/news.ts、
src/lib/scheduler.ts、src/lib/market-data.ts、src/app/page.tsx 主容器；不得提交真实密钥。

交付物：历史复盘接口、命中率统计、时间线回看、ReplayPanel 完成版。

验收标准（M7）：
- 历史分析与对话时间线可回看；
- 命中率统计口径清晰且无收益承诺；
- 股票/时间范围筛选正确；
- corepack pnpm typecheck、lint 通过。

验证命令：corepack pnpm typecheck；corepack pnpm lint；用 1 只有数据的股票走通复盘流程。
约束：代码注释与提交信息使用中文；密钥只写 .env；不提交密钥；不改共享类型语义。
完成后报告：复盘样例、验证结果、修改文件列表，等待合并。
```

### Agent N3：数据源健康与调度面板

```
工作分支：feature/p7-datasource-scheduler-dashboard

工作目录：仓库根目录。
基线：基于已合并 feature/p7-base 的最新 main 创建。
角色：你是“数据源健康与调度面板”开发 agent，负责里程碑 M8。

目标：
1. 落地 DataSourceStatus：对 AkShare/Tencent 行情、Tavily、DeepSeek、R2 分别做健康探测，
   返回 online/degraded/offline、延迟、最近成功时间、连续失败次数。
2. 展示 SchedulerJob：读取 refresh/cleanup 的 cron、最近运行时间、状态与 job_runs 历史。
3. UI：数据源状态卡片、健康度、最近检查时间与失败提示；管理按钮触发手动刷新/清理。
4. 外部服务未配置密钥时，标记为 degraded/offline 并展示降级说明，不阻断页面。

允许修改范围：src/lib/datasource-health.ts、src/app/api/admin/datasources/、
src/components/panels/DataSourcePanel.tsx；只读使用既有 observability/scheduler。

禁止修改：data-service/、src/lib/chat.ts、src/lib/analysis.ts、src/lib/news.ts、
src/lib/scheduler.ts 的核心执行逻辑、src/lib/market-data.ts、src/app/page.tsx 主容器；
不得提交真实密钥。

交付物：数据源健康探测、DataSourcePanel 完成版、调度任务状态展示、手动刷新/清理联动。

验收标准（M8）：
- 面板正确展示四类数据源健康状态；
- 未配置密钥时能显示降级原因；
- refresh/cleanup 手动触发后 job_runs 状态更新可见；
- corepack pnpm typecheck、lint 通过。

验证命令：corepack pnpm typecheck；corepack pnpm lint；检查健康探测输出样例。
约束：代码注释与提交信息使用中文；密钥只写 .env；不提交密钥；不改共享类型语义。
完成后报告：健康探测逻辑、输出样例、验证结果、修改文件列表，等待合并。
```

### Agent N4：下一阶段集成与整体验收

```
工作分支：feature/p7-integration

工作目录：仓库根目录。
基线：基于已合并 feature/p7-watchlist、feature/p7-replay、feature/p7-datasource-scheduler-dashboard
的最新 main/集成分支创建。
角色：你是“下一阶段集成与整体验收” agent。

前置：三个功能分支已通过自测并合并到集成分支。
目标：
1. 合并 N1/N2/N3，解决 panel、路由、store 的接口冲突。
2. 跑通 M6–M8 验收，并确认既有 M1–M5 无回归。
3. 统一数据源降级提示、新鲜度展示与免责声明。
4. 运行 corepack pnpm typecheck、lint、build。

允许修改范围：以集成修复为主，可修改任意文件，但不新增大功能。
禁止修改：不新增超出 M6–M8 范围的功能；不提交真实密钥。

交付物：完整集成修复、M6–M8 验收记录、最终可合并的 MVP 增量。

验收标准：M6–M8 全部通过；M1–M5 无回归；typecheck/lint/build 通过；未提交真实密钥。
验证命令：corepack pnpm typecheck；corepack pnpm lint；corepack pnpm build。
约束：代码注释与提交信息使用中文；密钥只写 .env；不提交密钥。
完成后报告：完整验收清单与结果、修改文件列表，等待合并到 main。
```

## 6. 里程碑验收对照

- M6 自选股与多股票：添加、删除、切换 3 只以上正常，刷新可恢复，切换后全链路股票一致。
- M7 历史复盘与命中率：时间线可回看，统计口径清晰，仅学习用途，无收益承诺。
- M8 数据源健康与调度：四类数据源状态与降级原因可见，手动刷新/清理日志可查。

## 7. 协作约定

- 第 1 波三个 agent 只改各自模块与 N0 预建的空 panel，不得修改 `page.tsx` 主容器。
- 共享类型只允许在 `feature/p7-base` 冻结，后续如需扩展先在各模块本地标注 TODO。
- 代码注释与提交信息使用中文；API Key 只写本地 `.env`，仓库仅保留 `.env.example`。
- 每个 agent 完成后自测再等待合并；合并顺序为 N1/N2/N3 各自通过后统一由 N4 集成。
