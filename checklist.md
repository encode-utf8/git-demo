# P1 工程初始化验收清单

- 关联文档：`docs/design.md`、`docs/parallel-dev-plan.md`、`docs/plan.md`
- 分支：`feature/scaffold`
- 负责阶段：P1 工程初始化

## 验收项

- [x] 已从 `main` 创建 `feature/scaffold` 分支
- [x] Next.js + TypeScript 工程可 `pnpm dev` 启动
- [x] Python FastAPI 侧车可启动，`/health` 返回 200
- [x] `/api/health` 返回 200
- [x] 共享类型覆盖 `docs/design.md` 第 6 节全部数据模型
- [x] 统一 API 响应/错误类型已定义
- [x] `docs/design.md` 第 7 节全部路由已有 mock 骨架
- [x] Drizzle schema 与迁移配置就绪，未执行线上迁移
- [x] `lib/store` 提供内存版 stub
- [x] `.env.example` 存在，占位齐全，无真实密钥
- [x] `.env` 已纳入 `.gitignore`
- [x] 根目录 `demo copy.ts` 已删除
- [x] `pnpm typecheck` 通过
- [x] 代码注释与提交信息为中文
- [x] 已为行情侧车新建专属 conda 环境（Python 3.12）

## 验证命令

```bash
pnpm typecheck
pnpm dev
curl http://127.0.0.1:3000/api/health
conda env create -n stock-analysis -f data-service/environment.yml
conda activate stock-analysis
uvicorn app.main:app --reload --app-dir data-service
curl http://127.0.0.1:8000/health
```

## 完成记录

- 完成日期：2026-08-31
- 结果：全部验收项通过
- 备注：全局 conda 启动器已修复（pyOpenSSL 23.2.0 -> 26.4.0），
  `conda` 与 `conda run -n stock-analysis` 均正常。
