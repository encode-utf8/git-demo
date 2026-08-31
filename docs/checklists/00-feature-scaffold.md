# 分支验收清单：feature/scaffold

- 关联文档：`docs/parallel-dev-plan.md`、`docs/design.md`、`docs/plan.md`
- 负责阶段：P1 工程初始化

## 角色与目标

搭好可运行的 TS + Python 工程骨架，冻结共享类型、数据模型与 API 契约，为后续并行开发提供稳定底座。

## 可修改范围

- 仓库根目录工程配置、Next 应用目录
- `data-service/`（仅 `/health`，不含 AkShare 业务）
- 共享类型、mock 路由骨架、Drizzle schema、`.env.example`、dev 脚本

## 禁止修改

- 不写业务逻辑
- 不实现 AkShare 具体抓取
- 不提交任何真实密钥

## 验收清单

- [ ] Next.js + TypeScript 工程可 `pnpm dev` 启动
- [ ] Python FastAPI 侧车可启动，`/health` 返回 200
- [ ] `/api/health` 返回 200
- [ ] 共享类型覆盖 `docs/design.md` 第 6 节全部数据模型
- [ ] 统一 API 响应/错误类型已定义
- [ ] `docs/design.md` 第 7 节全部路由已有 mock 骨架
- [ ] Drizzle schema 与迁移配置就绪，未执行线上迁移
- [ ] `lib/store` 提供内存版 stub
- [ ] `.env.example` 存在，占位齐全，无真实密钥
- [ ] `.env` 已纳入 `.gitignore`
- [ ] 根目录 `demo copy.ts` 已删除或忽略
- [ ] `pnpm typecheck` 通过
- [ ] 代码注释与提交信息为中文

## 验证命令

```bash
pnpm typecheck
pnpm dev
curl http://127.0.0.1:3000/api/health
cd data-service && uvicorn main:app --reload
curl http://127.0.0.1:8000/health
```

## 完成记录

- 完成日期：
- 结果：
- 备注：
