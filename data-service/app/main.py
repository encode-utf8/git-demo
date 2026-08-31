"""行情数据侧车入口。

本阶段仅提供健康检查，不包含 AkShare 具体业务实现。
后续 feature/quote-kline 在此扩展 quote/kline/fundamental/moneyflow 接口。
"""

from fastapi import FastAPI

app = FastAPI(
    title="个股盘面分析行情数据侧车",
    description="FastAPI 行情服务，提供标准化 JSON 接口。",
    version="0.1.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    """健康检查：返回服务状态。"""
    return {
        "status": "ok",
        "service": "data-service",
        "version": "0.1.0",
    }
