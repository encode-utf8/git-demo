# 分支验收清单：feature/quote-kline

- 关联文档：`docs/parallel-dev-plan.md`、`docs/design.md` 第 7/9 节
- 负责里程碑：M1 盘面展示

## 角色与目标

实现行情数据侧车与盘面展示：股票代码输入、当前行情快照、分时/日/周/月 K 线、本地技术指标计算。

## 可修改范围

- `data-service/`（AkShare 行情实现）
- 行情/K 线/指标相关 API 路由
- 盘面页面与组件
- `lib/indicators/`

## 禁止修改

- `lib/store/`、`lib/search/`、`lib/agent/chat/`、`lib/scheduler/`
- 共享已冻结类型（如需新类型先放本模块并注明 TODO）

## 验收清单

- [x] `GET /api/stocks/:code/quote` 返回标准化行情
- [x] `GET /api/stocks/:code/kline?period=&adjust=` 支持分时/日/周/月
- [x] `GET /api/stocks/:code/indicators` 正常返回
- [x] MA、MACD、KDJ、RSI、BOLL 本地计算正确
- [x] 股票代码输入、校验与市场识别可用
- [x] 当前行情快照展示完整
- [x] K 线图展示无报错
- [x] 指标图展示无报错
- [x] 数据源异常时有降级提示与更新时间
- [x] 至少 3 只不同市场股票查询正常，数据与公开行情一致
- [x] `pnpm typecheck` 通过
- [x] 代码注释为中文，密钥未提交

## 验证命令

```bash
pnpm typecheck
pnpm dev
curl "http://127.0.0.1:3000/api/stocks/600519/quote"
curl "http://127.0.0.1:3000/api/stocks/600519/kline?period=day&adjust=qfq"
```

## 完成记录

- 完成日期：2026-09-01
- 自测股票：600519、000001、830799
- 结果：全部通过；真实行情由 `feature/real-market-data` 落地，详见 `data-service/checklist.md`。
- 备注：真实数据源不可用时自动降级为确定性演示数据，并标记 `source` 与 `fetched_at`。
