# 分支验收清单：feature/integration-polish

- 关联文档：`docs/parallel-dev-plan.md`、`docs/plan.md` 第 3 节
- 负责里程碑：M5 学习体验与整体验收

## 角色与目标

集成 A/B/C/D 四个模块，串通全链路，补齐历史回看、风险提示、可观测性，跑通 M1–M5 全部验收。

## 可修改范围

- 以集成修复为主，可修改任意文件，但不新增大功能

## 禁止修改

- 不新增超出 MVP 范围的功能
- 不提交任何真实密钥

## 验收清单

- [x] 盘面→分析→对话→持久化/清理全链路联调通过
- [x] 历史分析与对话时间线回看可用
- [x] 风险提示、免责声明、数据更新时间与新鲜度展示完善
- [x] 可观测性：外部调用次数、失败率、缓存复用命中率
- [x] M1 盘面展示验收通过
- [x] M2 AI 资讯与分析验收通过
- [x] M3 对话助手验收通过
- [x] M4 持久化与清理验收通过
- [x] M5 学习体验验收通过
- [x] 界面标注数据时间与免责声明
- [x] 全链路无报错
- [x] `pnpm typecheck` 通过
- [x] 代码注释为中文，密钥未提交

## 验证命令

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm dev
# 按 docs/plan.md 第 3 节逐项核对 M1–M5
```

## 完成记录

- 完成日期：2026-09-01
- 结果：M1–M5 验收通过，`typecheck` 与 `lint` 通过
- 备注：未配置外部密钥时自动使用确定性演示数据并明确标注来源；配置 `.env` 后走 Tavily/DeepSeek/侧车真实链路。


## 真实环境补充验证（2026-09-01）
- [x] Neon 数据库连接成功并应用 Drizzle 迁移
- [x] Drizzle store 写入/读取验证通过
- [x] 资讯清理真实软删除验证通过
- [x] Tavily/DeepSeek 真实调用验证通过
- [x] corepack pnpm build 通过
- [ ] Cloudflare R2 真实写入：待修正 R2_ACCOUNT_ID / R2_SECRET_ACCESS_KEY 格式


## R2 复测通过（2026-09-01）
- [x] R2 字段格式校验通过
- [x] R2 Put/Get/Delete 自检通过
- [x] AI 分析报告快照已写入 R2 并回填 r2_key
