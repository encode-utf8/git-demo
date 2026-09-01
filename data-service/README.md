# data-service

个股盘面分析行情数据侧车（FastAPI）。

## 环境准备

必须使用项目专属 conda 环境：

```bash
conda env create -n stock-analysis -f data-service/environment.yml
conda activate stock-analysis
```

## 启动

```bash
conda activate stock-analysis
uvicorn app.main:app --reload --app-dir data-service --host 127.0.0.1 --port 8000
```

或在仓库根目录执行：

```bash
pnpm dev:data
```

## 健康检查

```bash
curl http://127.0.0.1:8000/health
```

当前阶段已实现 `/health`、`/quote`、`/kline`：

- `/quote` 优先返回 AkShare/Tencent 真实行情，字段包含最新价、涨跌幅、开高低收、量额、换手率、PE/PB、市值；
- `/kline` 支持 `minute/day/week/month` 与 `qfq/hfq/none`；
- AkShare 未安装或接口失败时自动降级为确定性数据，并标记 `source=deterministic-fallback`。
