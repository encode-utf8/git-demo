# M8 数据源健康与调度面板验收清单

- 关联文档：`docs/plan.md`、`docs/parallel-dev-plan.md`、`docs/design.md`
- 分支：`feature/p7-datasource-scheduler-dashboard`
- 负责阶段：P7 里程碑 M8

## 任务目标

- 对 AkShare/Tencent 行情、Tavily、DeepSeek、R2 做健康探测。
- 返回 online/degraded/offline、延迟、最近成功时间、连续失败次数。
- 展示 refresh/cleanup 的 cron、最近运行时间、状态与 job_runs 历史。
- 面板支持手动刷新/清理，并展示未配置密钥时的降级说明。

## 验收项

- [x] 已创建目标功能分支且未直接修改 main
- [x] `src/lib/datasource-health.ts` 实现四类数据源健康探测
- [x] `src/app/api/admin/datasources/route.ts` 返回数据源与调度任务快照
- [x] `DataSourcePanel.tsx` 展示健康卡片、调度任务与手动按钮
- [x] 未配置密钥时展示降级原因，不阻断页面
- [x] 手动刷新/清理后 `job_runs` 状态更新可见
- [x] `corepack pnpm typecheck` 通过
- [x] `corepack pnpm lint` 通过
- [x] 未提交真实密钥，代码注释为中文

## 验证命令

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm dev
```

## 完成记录

- 完成日期：2026-09-03
- 结果：typecheck、lint、接口输出与手动刷新/清理联动均通过
- 备注：健康探测在无外部密钥时按降级展示；未提交真实密钥

