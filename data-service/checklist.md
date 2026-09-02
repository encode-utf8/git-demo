# P2 真实行情数据接入验收清单

- 关联文档：`docs/plan.md`、`docs/design.md`、`docs/checklists/01-feature-quote-kline.md`
- 分支：`feature/real-market-data`
- 负责阶段：P2 真实数据接入

## 目标

1. `data-service` 接入 AkShare，实现真实 `/quote` 与 `/kline`。
2. 保留确定性降级路径，返回中明确标记 `source` 与 `fetched_at`。
3. TS 侧贯通真实行情链路，界面明确展示更新时间与来源。

## 可修改范围

- `data-service/`
- `src/lib/data-service.ts`
- `src/lib/market-data.ts`
- `src/lib/market.ts`
- 行情/K 线/指标相关路由
- `src/components/panels/QuotePanel.tsx`
- `src/components/panels/ChartPanel.tsx`
- `src/components/panels/IndicatorsPanel.tsx`

## 验收项

- [x] `/quote` 接入真实行情，返回最新价、涨跌幅、开高低收、量额、换手率、PE/PB、市值
- [x] `/kline` 支持 minute/day/week/month 与 qfq/hfq/none
- [x] 真实数据 `source=akshare` 且 `fetched_at` 为抓取时间
- [x] 降级数据 `source=deterministic-fallback` 且 `fetched_at` 为生成时间
- [x] TS 侧 `/api/stocks/[code]/quote` 贯通真实行情
- [x] TS 侧 `/api/stocks/[code]/kline` 贯通真实 K 线
- [x] TS 侧 `/api/stocks/[code]/indicators` 使用真实 K 线本地计算
- [x] 界面展示数据来源与更新时间
- [x] 600519、000001、830799 三只股票真实/降级验证通过
- [x] `corepack pnpm typecheck` 通过
- [x] `corepack pnpm lint` 通过
- [x] `corepack pnpm build` 通过

## 验证命令

```bash
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
# 有 Python 环境时启动侧车并请求三只股票
python -m uvicorn app.main:app --app-dir data-service --host 127.0.0.1 --port 8000
```

## 风险与遗留

- AkShare 依赖非官方网页源，接口失败时自动降级为确定性数据。
- K 线共享类型暂未扩展 `source/fetched_at`，由行情快照在界面统一展示来源与时间；如需 K 线独立溯源，后续在模块内新增 TODO。
