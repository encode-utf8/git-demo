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

当前阶段只实现 `/health`，不包含 AkShare 业务逻辑。
