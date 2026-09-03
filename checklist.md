# M5 集成与整体验收清单

- 关联文档：`docs/plan.md`、`docs/design.md`、`docs/checklists/05-feature-integration-polish.md`
- 分支：`feature/integration-polish`
- 负责阶段：P6 打磨与整体验收

## 验收项

- [x] 已创建 `integration` 并合并 M1–M4 功能分支
- [x] 已基于集成分支创建 `feature/integration-polish`
- [x] 盘面、资讯、分析、对话、持久化/清理全链路联调通过
- [x] 沪深北三市场示例股票查询正常
- [x] 行情、K 线、MA/MACD/KDJ/RSI/BOLL 指标返回正常
- [x] AI 分析报告含来源、影响周期与风险提示
- [x] 对话 SSE 流式输出、工具调用与 3 轮上下文回看正常
- [x] 历史报告与历史会话时间线可回看
- [x] 行情数据时间、新鲜度、来源与免责声明已展示
- [x] 可观测性指标含外部调用次数、失败率、缓存复用命中率
- [x] 手动刷新与到期资讯清理任务可执行并记录日志
- [x] 未配置外部密钥时自动降级为演示数据并标注
- [x] `corepack pnpm typecheck` 通过
- [x] `corepack pnpm lint` 通过
- [x] Python 侧车 `/quote`、`/kline`、`/health` 已联调通过
- [x] 代码注释为中文，未提交真实密钥

## 验证命令

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm dev
python -m uvicorn app.main:app --app-dir data-service --host 127.0.0.1 --port 8000
```

## 完成记录

- 完成日期：2026-09-01
- 结果：M1–M5 全部验收通过
- 备注：密钥只写入本地 `.env`，仓库仅保留 `.env.example`。


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


## 下一阶段 MVP 底座（page 拆分与契约冻结）

- 关联文档：`docs/plan.md`、`docs/design.md`
- 分支：`feature/next-mvp`
- 目标：仅做结构拆分与契约新增，页面功能与展示效果无回归

### 验收项

- [x] 已确认开发分支为 `feature/next-mvp`，未直接在 `main` 上修改
- [x] `src/app/page.tsx` 已拆分为 10 个 panel 组件
- [x] 页面容器保留全部状态管理与旧交互逻辑
- [x] 新增 `DataSourceStatus`、`SchedulerJob`、`ChatStreamEvent` 共享契约
- [x] 未破坏既有共享类型字段
- [x] `data-service` `/quote`、`/kline` 已补充标准响应契约注释
- [x] 未实现或接入 AkShare
- [x] 未提交任何真实密钥

### 验证命令

```bash
corepack pnpm install
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
```

### 完成记录

- 完成日期：2026-09-01
- 结果：install、typecheck、lint、build 全部通过
- 备注：等待主控合并到 main。


## M6-M8 P7 集成验收（已完成，2026-09-03）

- 关联文档：`docs/plan.md`、`docs/next-phase-dev-plan.md`、`docs/design.md`
- 分支：`feature/p7-base`、`feature/p7-watchlist`、`feature/p7-replay`、`feature/p7-datasource-scheduler-dashboard`、`feature/p7-integration`
- 目标：完成 P7 里程碑 M6-M8，并确认 M1-M5 无回归

### 验收项

- [x] M6 自选股：添加、删除、排序、备注与切换 3 只以上正常，刷新可恢复，切换后全链路股票一致
- [x] M7 历史复盘：`/api/replay/stats` 与 `/api/replay/timeline` 可回看，统计口径清晰，仅学习用途且无收益承诺
- [x] M8 数据源健康：四类数据源状态与降级原因可见，手动 refresh/cleanup 后 `job_runs` 可查
- [x] M1-M5 回归：health/stock/quote/kline/indicators/news/reports/conversations/observability 均正常
- [x] `corepack pnpm typecheck`、`lint`、`build` 全部通过
- [x] 未提交真实密钥，密钥仅保留在 `.env.example` 的占位值

### 完成记录

- 完成日期：2026-09-03
- 结果：M6-M8 全部通过，M1-M5 无回归，typecheck、lint、build 通过
- 详细记录：`docs/checklists/07-feature-datasource-scheduler-dashboard.md`、`docs/checklists/08-feature-p7-integration.md`


## 一键启动脚本验收（2026-09-03）

- 关联文档：`README.md`
- 分支：`feature/one-click-launch`
- 目标：为 Windows/Linux 个人本地使用提供一键启动脚本，A 股行情可无密钥降级启动

### 验收项

- [x] Windows 脚本 `start.ps1` 存在，可检查 Node.js、pnpm、`.env`、Python 环境
- [x] Linux 脚本 `start.sh` 存在，可检查 Node.js、pnpm、`.env`、Python 环境
- [x] 脚本能优先复用 conda 的 `stock-analysis` 环境或本地 `.venv`
- [x] 脚本会安装行情侧车基础依赖，并可选安装 AkShare
- [x] 脚本会启动 `127.0.0.1:8000` 行情侧车并等待健康检查
- [x] 脚本会启动 `127.0.0.1:3000` Web 前端并支持 Ctrl+C 清理
- [x] `.logs/` 日志目录已加入 `.gitignore`
- [x] `README.md` 已补充一键启动用法
- [x] `start.ps1` PowerShell 语法检查通过
- [x] `start.sh` Bash 语法检查通过
- [ ] 未提交真实密钥，仅使用 `.env.example` 占位值

### 验证方式

- Windows：`start.bat` 或 `powershell -NoProfile -ExecutionPolicy Bypass -File ./start.ps1`
- Linux：`./start.sh`
- 健康检查：`GET http://127.0.0.1:8000/health`、`GET http://127.0.0.1:3000/api/health`

### 完成记录

- 完成日期：2026-09-03
- 结果：脚本已创建并完成语法检查；真实端到端启动需在目标系统验证
- 遗留事项：AkShare 为可选依赖，失败时仍通过 Tencent 行情提供沪深 A 股真实数据


## Windows bat 入口更新验收（2026-09-03）

- 关联文档：`README.md`
- 分支：`feature/bat-launch`
- 目标：将 Windows 推荐入口从 PowerShell 调整为更易双击执行的 `start.bat`

### 验收项

- [x] 新增 `start.bat`，作为 Windows 一键启动推荐入口
- [x] `start.bat` 支持 `--skip-install`、`--no-browser` 参数
- [x] `start.bat` 会检查 Node.js、pnpm/corepack、`.env` 与前端依赖
- [x] 新增 `scripts/start-data.ps1` 助手，负责 Python 环境、依赖安装与行情侧车启动
- [x] `start.bat` 在 Web 退出后会清理行情侧车进程
- [x] `package.json` 的 `start:win` 改为 `cmd /c start.bat`
- [x] `README.md` 已将 `start.bat` 标为 Windows 推荐方式
- [x] `start.bat` 基础语法检查通过
- [x] `scripts/start-data.ps1` PowerShell 语法检查通过
- [ ] 未提交真实密钥，仅使用 `.env.example` 占位值

### 验证方式

- Windows 双击：直接运行 `start.bat`
- Windows 命令：`pnpm start:win`
- 健康检查：`GET http://127.0.0.1:8000/health`、`GET http://127.0.0.1:3000/api/health`

### 完成记录

- 完成日期：2026-09-03
- 结果：bat 入口与助手脚本已创建并完成语法检查
- 遗留事项：真实端到端启动依赖目标 Windows 环境的 Node.js、Python 与网络条件
