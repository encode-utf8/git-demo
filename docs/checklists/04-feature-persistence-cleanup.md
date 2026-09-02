# 分支验收清单：feature/persistence-cleanup

- 关联文档：`docs/parallel-dev-plan.md`、`docs/design.md` 第 6/10/11 节
- 负责里程碑：M4 持久化与清理

## 角色与目标

实现 store 具体存储、TTL 分级缓存、node-cron 定时清理与配额统计，降低外部调用与本地磁盘占用。

## 可修改范围

- `lib/store/`
- `lib/cache/`
- `lib/scheduler/`
- admin 路由
- 可观测性相关文件

## 禁止修改

- `data-service/`、`lib/search/`、`lib/agent/analysis/`、`lib/agent/chat/`
- 共享已冻结类型

## 验收清单

- [x] `lib/store` 覆盖第 6 节全部数据模型读写
- [x] R2 对象存储封装可用
- [x] 保持 scaffold 冻结的 store 接口签名不变
- [x] TTL 分级缓存生效
- [x] 未命中回写、失败不覆盖有效数据
- [x] node-cron 每日清理到期非 pinned 资讯（软删除）
- [x] 长期消息默认不自动清理
- [x] `job_runs` 记录可查
- [x] `POST /api/admin/refresh` 可用
- [x] `POST /api/admin/cleanup` 可用
- [x] 同代码第二次查询明显减少外部调用
- [x] 本地磁盘占用可控
- [x] 清理日志可查
- [x] `pnpm typecheck` 通过
- [x] 代码注释为中文，密钥未提交

## 验证命令

```bash
pnpm typecheck
pnpm dev
curl -X POST "http://127.0.0.1:3000/api/admin/cleanup"
```

## 完成记录

- 完成日期：2026-09-01
- 结果：全部通过；真实 Neon/R2、缓存、清理任务已由集成验收验证。
- 备注：仅远程真实数据库才启用 Drizzle，本地占位配置自动降级内存存储。
