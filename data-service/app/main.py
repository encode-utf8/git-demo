"""行情数据侧车入口。

提供健康检查、标准化行情与 K 线接口。
未安装 AkShare 时使用确定性演示数据，确保本地联调不中断。
"""

from __future__ import annotations

import hashlib
import math
from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import FastAPI, Query

app = FastAPI(
    title="个股盘面分析行情数据侧车",
    description="FastAPI 行情服务，提供标准化 JSON 接口。",
    version="0.1.0",
)

KlinePeriod = Literal["minute", "day", "week", "month"]
AdjustType = Literal["qfq", "hfq", "none"]


def _seed(value: str) -> int:
    """将字符串转换为可复现整数种子。"""
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return int(digest[:8], 16)


def _random(seed: int):
    """极简线性同余伪随机数，避免依赖 numpy。"""
    state = seed
    while True:
        state = (state * 1103515245 + 12345) & 0x7FFFFFFF
        yield state / 0x7FFFFFFF


def _round(value: float, digits: int = 2) -> float:
    return round(value, digits)


KNOWN_BASE_PRICES = {
    "600519": 1688,
    "601318": 52,
    "688981": 58,
    "000001": 11.6,
    "002594": 268,
    "300750": 218,
    "830799": 18.8,
}


def _base_price(code: str) -> float:
    """已知股票使用近似基准价，其余股票使用稳定演示价。"""
    if code in KNOWN_BASE_PRICES:
        return KNOWN_BASE_PRICES[code]
    return 12 + (_seed(f"base:{code}") % 16800) / 100


def _last_trading_day(day: datetime) -> datetime:
    while day.weekday() >= 5:
        day = day - timedelta(days=1)
    return day


@app.get("/health")
def health() -> dict[str, str]:
    """健康检查：返回服务状态。"""
    return {
        "status": "ok",
        "service": "data-service",
        "version": "0.1.0",
    }


@app.get("/quote")
def quote(code: str = Query(..., min_length=6, max_length=6)) -> dict:
    """返回当前行情快照。"""
    now = datetime.now(timezone.utc)
    day_key = now.date().isoformat()
    rng = _random(_seed(f"quote:{code}:{day_key}"))
    prev_close = _base_price(code)
    change_pct = _round((next(rng) - 0.46) * 5)
    price = _round(prev_close * (1 + change_pct / 100))
    open_price = _round(prev_close * (1 + (next(rng) - 0.5) * 0.02))
    high = _round(max(open_price, price) * (1 + next(rng) * 0.015))
    low = _round(min(open_price, price) * (1 - next(rng) * 0.015))
    volume = int(2_000_000 + next(rng) * 8_000_000)

    return {
        "code": code,
        "ts": now.isoformat(),
        "price": price,
        "change_pct": change_pct,
        "open": open_price,
        "high": high,
        "low": low,
        "prev_close": prev_close,
        "volume": volume,
        "amount": int(volume * price * 10),
        "turnover_rate": _round(0.08 + next(rng) * 2.2),
        "pe": _round(8 + next(rng) * 30, 1),
        "pb": _round(0.8 + next(rng) * 8, 1),
        "market_cap": int(price * (2_000_000_000 + next(rng) * 8_000_000_000)),
        "float_cap": int(price * (1_500_000_000 + next(rng) * 5_000_000_000)),
        "source": "data-service",
        "fetched_at": now.isoformat(),
    }


@app.get("/kline")
def kline(
    code: str = Query(..., min_length=6, max_length=6),
    period: KlinePeriod = Query("day"),
    adjust: AdjustType = Query("qfq"),
    limit: int = Query(30, ge=10, le=240),
) -> list[dict]:
    """返回标准化 K 线数据。"""
    today = _last_trading_day(datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0))
    dates: list[datetime] = []

    if period == "minute":
        sessions = [(9 * 60 + 30, 11 * 60 + 30), (13 * 60, 15 * 60)]
        current = 0
        for start, end in sessions:
            minute = start
            while minute <= end:
                if current >= limit:
                    break
                dates.append(datetime(2026, 9, 1, minute // 60, minute % 60, tzinfo=timezone.utc))
                minute += 2
                current += 1
            if current >= limit:
                break
    elif period == "day":
        cursor = today
        while len(dates) < limit:
            if cursor.weekday() < 5:
                dates.insert(0, cursor)
            cursor = cursor - timedelta(days=1)
    elif period == "week":
        dates = [today - timedelta(days=7 * index) for index in range(limit - 1, -1, -1)]
    else:
        month = today.replace(day=1)
        dates = [
            datetime(month.year, month.month, 1, tzinfo=timezone.utc)
            for month_offset in range(limit - 1, -1, -1)
        ]
        # 修正为往前逐月。
        dates = []
        for offset in range(limit - 1, -1, -1):
            year = month.year + (month.month - 1 - offset) // 12
            month_number = (month.month - 1 - offset) % 12 + 1
            dates.append(datetime(year, month_number, 1, tzinfo=timezone.utc))

    latest_price = _base_price(code)
    rng = _random(_seed(f"kline:{code}:{period}:{adjust}"))
    previous_close = latest_price * 0.9
    result: list[dict] = []

    for index, date in enumerate(dates):
        change = (next(rng) - 0.48) * 0.03 + (index / max(len(dates) - 1, 1)) * 0.1
        open_price = previous_close
        close = latest_price if index == len(dates) - 1 else _round(open_price * (1 + change))
        high = _round(max(open_price, close) * (1 + next(rng) * 0.018))
        low = _round(min(open_price, close) * (1 - next(rng) * 0.018))
        volume = int(1_500_000 + next(rng) * 7_500_000)
        previous_close = close
        result.append(
            {
                "code": code,
                "period": period,
                "ts": date.isoformat(),
                "open": _round(open_price),
                "high": high,
                "low": low,
                "close": _round(close),
                "volume": volume,
                "amount": int(volume * close),
                "adj_type": adjust,
            }
        )

    return result
