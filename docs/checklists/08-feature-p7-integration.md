# P7 集成与整体验收清单

- 关联文档：`docs/plan.md`、`docs/next-phase-dev-plan.md`、`docs/design.md`
- 分支：`feature/p7-integration`
- 负责阶段：P7 里程碑 M6-M8
- 验收角色：下一阶段集成与整体验收 agent

## 任务目标

- 合并 N1 自选股、N2 历史复盘、N3 数据源健康与调度面板。
- 修复 panel、路由、store 之间的接口冲突。
- 跑通 M6-M8，并确认既有 M1-M5 无回归。
- 统一数据源降级提示、新鲜度展示与免责声明。
- 通过 `corepack pnpm typecheck`、`lint`、`build`，且未提交真实密钥。

## 验收清单

- [x] M6 自选股：添加、删除、切换 3 只以上正常，刷新可恢复，切换后全链路股票一致
- [x] M7 历史复盘：时间线可回看，统计口径清晰，仅学习用途且无收益承诺
- [x] M8 数据源健康：四类数据源状态与降级原因可见，手动刷新/清理日志可查
- [x] M1-M5 回归：行情、分析、对话、持久化、学习体验仍可用
- [x] 数据源降级提示、新鲜度展示与免责声明文案统一
- [x] `corepack pnpm typecheck` 通过
- [x] `corepack pnpm lint` 通过
- [x] `corepack pnpm build` 通过
- [x] 未提交真实密钥，密钥仅保留在 `.env.example` 的占位值

## 验证命令

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

## 完成记录

- 完成日期：2026-09-03
- 验证结果：
  - M6 自选股接口：GET/POST/PUT/PATCH/DELETE 通过，添加 600519、000001、830799 后排序、备注、删除均正常。
  - M7 复盘接口：`/api/replay/stats` 与 `/api/replay/timeline` 返回统计与时间线，非法代码返回 400。
  - M8 数据源接口：四类数据源与两类调度任务返回正常，手动 refresh/cleanup 后 `job_runs` 可查。
  - M1-M5 smoke：health/stock/quote/kline/indicators/news/reports/conversations/observability 全部 200。
  - `corepack pnpm typecheck`、`lint`、`build` 均通过。
- 修改文件列表：
  - 集成修复：`src/app/page.tsx`、`src/components/panels/WatchlistPanel.tsx`、`src/components/panels/ReplayPanel.tsx`
  - 数据访问去重：`src/lib/store/watchlist.ts`、`src/lib/store/index.ts`
  - 统一展示：`src/lib/format.ts`、`src/components/panels/QuotePanel.tsx`、`src/components/panels/DataSourcePanel.tsx`
  - N1-N3 功能：`src/app/api/watchlist/route.ts`、`src/lib/watchlist.ts`、`src/app/api/replay/stats/route.ts`、`src/app/api/replay/timeline/route.ts`、`src/lib/replay.ts`、`src/app/api/admin/datasources/route.ts`、`src/lib/datasource-health.ts`
  - 验收记录：`docs/checklists/07-feature-datasource-scheduler-dashboard.md`、`docs/checklists/08-feature-p7-integration.md`
- 备注：远端 Neon 已应用既有 `drizzle/0002_eminent_celestials.sql` 自选股表迁移；测试数据已清理，未提交真实密钥。
