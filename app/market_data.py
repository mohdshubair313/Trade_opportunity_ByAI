"""
Market data service — backs the real-data charts on /results.

Uses yfinance against NSE sector indices. We map each user-facing sector name
to a Yahoo ticker; unsupported sectors return an 'unavailable' payload so the
frontend can gracefully fall back to a 'coming soon' card.
"""
from __future__ import annotations

import logging
import os
import tempfile
import time
from dataclasses import dataclass
from typing import Dict, List, Optional

try:
    import yfinance as yf
except Exception as exc:  # noqa: BLE001 - environment-specific import failures
    yf = None  # type: ignore[assignment]
    _YFINANCE_IMPORT_ERROR = exc
else:
    _YFINANCE_IMPORT_ERROR = None

logger = logging.getLogger(__name__)


# yfinance's default TzCache location (~/.cache/py-yfinance) races on container
# restarts: the folder persists from a prior run, but its SQLite db handle is
# re-opened with mode='create', which errors with [Errno 17] File exists. The
# library then logs a loud INFO line and continues without caching. Redirect
# the cache to a per-process tmp dir and ensure it exists — quiet *and* cached.
_TZ_CACHE_DIR = os.path.join(tempfile.gettempdir(), "tradeinsight_yf_tz")
os.makedirs(_TZ_CACHE_DIR, exist_ok=True)
try:
    if yf is not None:
        yf.set_tz_cache_location(_TZ_CACHE_DIR)
except Exception as _exc:  # pragma: no cover - yfinance internal
    logger.debug("yfinance tz cache redirect failed: %s", _exc)


class _YFinanceTzCacheFilter(logging.Filter):
    """Swallow the harmless 'Failed to create TzCache' warning from yfinance.

    yfinance emits this on every import when its default cache path exists but
    can't be re-opened; the functional impact is just 'no timezone caching',
    which our redirect above already handles. Hide the message so ops logs
    aren't flooded."""

    def filter(self, record: logging.LogRecord) -> bool:
        return "Failed to create TzCache" not in record.getMessage()


logging.getLogger("yfinance").addFilter(_YFinanceTzCacheFilter())


# Sector -> Yahoo ticker. Keys are normalised lowercase.
# Indices live on Yahoo without the .NS suffix (they're quoted as ^SYMBOL).
SECTOR_TICKERS: Dict[str, str] = {
    "technology": "^CNXIT",
    "it": "^CNXIT",
    "pharmaceuticals": "^CNXPHARMA",
    "pharma": "^CNXPHARMA",
    "healthcare": "^CNXPHARMA",
    "banking": "^NSEBANK",
    "fintech": "^NSEBANK",
    "finance": "^CNXFIN",
    "automotive": "^CNXAUTO",
    "auto": "^CNXAUTO",
    "fmcg": "^CNXFMCG",
    "food processing": "^CNXFMCG",
    "metals & mining": "^CNXMETAL",
    "metals": "^CNXMETAL",
    "energy": "^CNXENERGY",
    "renewable energy": "^CNXENERGY",
    "infrastructure": "^CNXINFRA",
    "realty": "^CNXREALTY",
    "real estate": "^CNXREALTY",
    "media": "^CNXMEDIA",
    "psu bank": "^CNXPSUBANK",
}

BENCHMARK_TICKER = "^NSEI"  # Nifty 50 for relative comparison


# Simple in-process cache so we don't hit yfinance on every request.
_cache: Dict[str, "CachedSectorData"] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


@dataclass
class CachedSectorData:
    captured_at: float
    payload: dict


def _normalise(sector: str) -> str:
    return (sector or "").strip().lower()


def resolve_ticker(sector: str) -> Optional[str]:
    return SECTOR_TICKERS.get(_normalise(sector))


def _fetch_history(ticker: str, period: str = "1y", interval: str = "1mo"):
    """Pull OHLCV history; returns a pandas DataFrame (possibly empty)."""
    if yf is None:
        raise RuntimeError(f"yfinance unavailable: {_YFINANCE_IMPORT_ERROR}")
    tk = yf.Ticker(ticker)
    return tk.history(period=period, interval=interval, auto_adjust=False)


def _day_change(ticker: str) -> Optional[Dict[str, float]]:
    """Return latest close + percentage change vs previous close."""
    try:
        hist = _fetch_history(ticker, period="5d", interval="1d")
    except Exception as exc:
        logger.warning("yfinance daily fetch failed for %s: %s", ticker, exc)
        return None
    if hist is None or hist.empty or len(hist) < 2:
        return None

    last = hist.iloc[-1]
    prev = hist.iloc[-2]
    close = float(last["Close"])
    prev_close = float(prev["Close"])
    pct = (close / prev_close - 1.0) * 100.0 if prev_close else 0.0
    volume = int(last["Volume"]) if "Volume" in last and not _is_nan(last["Volume"]) else 0
    return {
        "close": round(close, 2),
        "change_pct": round(pct, 2),
        "volume": volume,
        "day_high": round(float(last["High"]), 2),
        "day_low": round(float(last["Low"]), 2),
    }


def _monthly_series(ticker: str) -> List[Dict[str, float]]:
    """Return 12 months of monthly closes for a trend chart."""
    try:
        hist = _fetch_history(ticker, period="1y", interval="1mo")
    except Exception as exc:
        logger.warning("yfinance monthly fetch failed for %s: %s", ticker, exc)
        return []
    if hist is None or hist.empty:
        return []

    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
              "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    series: List[Dict[str, float]] = []
    for idx, row in hist.iterrows():
        try:
            series.append({
                "month": months[idx.month - 1],
                "year": int(idx.year),
                "close": round(float(row["Close"]), 2),
            })
        except Exception:
            continue
    # yfinance's monthly index sometimes returns the partial current month twice;
    # de-dupe by (year, month) keeping the latest.
    dedup: Dict[str, Dict[str, float]] = {}
    for point in series:
        dedup[f"{point['year']}-{point['month']}"] = point
    return list(dedup.values())


def _52_week_range(ticker: str) -> Optional[Dict[str, float]]:
    try:
        hist = _fetch_history(ticker, period="1y", interval="1d")
    except Exception as exc:
        logger.warning("yfinance 52w fetch failed for %s: %s", ticker, exc)
        return None
    if hist is None or hist.empty:
        return None
    return {
        "high": round(float(hist["High"].max()), 2),
        "low": round(float(hist["Low"].min()), 2),
    }


def _is_nan(value) -> bool:
    try:
        return value != value  # NaN check
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Multi-sector correlation matrix (feeds the CorrelationHeatmap card)
# ---------------------------------------------------------------------------

# A cleaned list of distinct sector indices (dedupe aliases pointing at the
# same ticker). Order is the display order for the heatmap.
_CORRELATION_SECTORS: Dict[str, str] = {
    "IT": "^CNXIT",
    "Pharma": "^CNXPHARMA",
    "Bank": "^NSEBANK",
    "Auto": "^CNXAUTO",
    "FMCG": "^CNXFMCG",
    "Metal": "^CNXMETAL",
    "Energy": "^CNXENERGY",
    "Infra": "^CNXINFRA",
    "Realty": "^CNXREALTY",
    "Media": "^CNXMEDIA",
}

_CORRELATION_CACHE: Dict[str, dict] = {}
_CORRELATION_TTL_SECONDS = 60 * 60 * 6  # 6 hours — the matrix barely moves intraday


def _pct_returns(closes: List[float]) -> List[float]:
    out: List[float] = []
    for i in range(1, len(closes)):
        if closes[i - 1]:
            out.append(closes[i] / closes[i - 1] - 1.0)
    return out


def _pearson(a: List[float], b: List[float]) -> float:
    n = min(len(a), len(b))
    if n < 2:
        return 0.0
    a, b = a[:n], b[:n]
    mean_a = sum(a) / n
    mean_b = sum(b) / n
    num = sum((a[i] - mean_a) * (b[i] - mean_b) for i in range(n))
    denom_a = (sum((a[i] - mean_a) ** 2 for i in range(n))) ** 0.5
    denom_b = (sum((b[i] - mean_b) ** 2 for i in range(n))) ** 0.5
    if not denom_a or not denom_b:
        return 0.0
    return max(-1.0, min(1.0, num / (denom_a * denom_b)))


_RELATIVE_CACHE: Dict[str, dict] = {}
_RELATIVE_TTL_SECONDS = 60 * 30  # 30 minutes


def get_sector_relative_strength(sector: str) -> dict:
    """
    Normalised daily close for the sector index and Nifty 50 over the last 6
    months. Both series start at 100 so the frontend can draw them on one axis
    and the reader sees sector vs benchmark at a glance.
    """
    key = _normalise(sector)
    ticker = resolve_ticker(sector)

    cached = _RELATIVE_CACHE.get(key)
    if cached and (time.time() - cached["_cached_at"]) < _RELATIVE_TTL_SECONDS:
        return cached["payload"]

    if not ticker:
        payload = {
            "status": "unavailable",
            "sector": sector,
            "reason": f"No NSE sector index mapped to '{sector}' yet.",
        }
        _RELATIVE_CACHE[key] = {"_cached_at": time.time(), "payload": payload}
        return payload

    def _series(t: str) -> List[Dict]:
        try:
            hist = _fetch_history(t, period="6mo", interval="1d")
        except Exception as exc:
            logger.warning("relative-strength fetch failed for %s: %s", t, exc)
            return []
        if hist is None or hist.empty or len(hist) < 5:
            return []
        closes = hist["Close"].tolist()
        first = float(closes[0]) if closes else 0
        if not first:
            return []
        out = []
        for idx, close in zip(hist.index, closes):
            try:
                out.append({
                    "date": idx.strftime("%Y-%m-%d"),
                    "value": round(float(close) / first * 100.0, 2),
                })
            except Exception:
                continue
        return out

    sector_series = _series(ticker)
    benchmark_series = _series(BENCHMARK_TICKER)
    if not sector_series or not benchmark_series:
        payload = {
            "status": "unavailable",
            "sector": sector,
            "ticker": ticker,
            "reason": "Upstream market data provider returned no rows.",
        }
        _RELATIVE_CACHE[key] = {"_cached_at": time.time(), "payload": payload}
        return payload

    sector_last = sector_series[-1]["value"]
    bench_last = benchmark_series[-1]["value"]
    outperformance = round(sector_last - bench_last, 2)

    payload = {
        "status": "ok",
        "sector": sector,
        "ticker": ticker,
        "benchmark_ticker": BENCHMARK_TICKER,
        "sector_series": sector_series,
        "benchmark_series": benchmark_series,
        "outperformance_pct": outperformance,
        "sector_total_return_pct": round(sector_last - 100.0, 2),
        "benchmark_total_return_pct": round(bench_last - 100.0, 2),
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _RELATIVE_CACHE[key] = {"_cached_at": time.time(), "payload": payload}
    return payload


def get_sector_correlation_matrix() -> dict:
    """Compute a 90-day pairwise correlation matrix across NSE sector indices."""
    cached = _CORRELATION_CACHE.get("matrix")
    if cached and (time.time() - cached["_cached_at"]) < _CORRELATION_TTL_SECONDS:
        return cached["payload"]

    series: Dict[str, List[float]] = {}
    skipped: List[str] = []
    for label, ticker in _CORRELATION_SECTORS.items():
        try:
            hist = _fetch_history(ticker, period="3mo", interval="1d")
        except Exception as exc:
            logger.warning("correlation: fetch failed for %s (%s): %s", label, ticker, exc)
            skipped.append(label)
            continue
        if hist is None or hist.empty or len(hist) < 30:
            skipped.append(label)
            continue
        closes = [float(c) for c in hist["Close"].tolist() if c == c]  # drop NaNs
        series[label] = _pct_returns(closes)

    labels = list(series.keys())
    matrix = [
        [round(_pearson(series[a], series[b]), 3) for b in labels]
        for a in labels
    ]

    payload = {
        "labels": labels,
        "matrix": matrix,
        "window_days": 90,
        "skipped": skipped,
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _CORRELATION_CACHE["matrix"] = {"_cached_at": time.time(), "payload": payload}
    return payload


# ---------------------------------------------------------------------------
# Per-sector snapshot (the main /market-data response)
# ---------------------------------------------------------------------------

def get_sector_market_data(sector: str) -> dict:
    """
    Return a payload shaped for the /results charts.

    Response shape:
        {
            "status": "ok" | "unavailable",
            "sector": "<input>",
            "ticker": "^CNXIT" | null,
            "vitals": { close, change_pct, volume, day_high, day_low },
            "benchmark": { close, change_pct } | null,
            "fifty_two_week": { high, low } | null,
            "trend": [ { month, year, close }, ... ],
            "captured_at": "<iso>"
        }
    """
    key = _normalise(sector)
    ticker = resolve_ticker(sector)

    cached = _cache.get(key)
    if cached and (time.time() - cached.captured_at) < _CACHE_TTL_SECONDS:
        return cached.payload

    if not ticker:
        payload = {
            "status": "unavailable",
            "sector": sector,
            "ticker": None,
            "reason": f"No NSE sector index mapped to '{sector}' yet.",
        }
        _cache[key] = CachedSectorData(time.time(), payload)
        return payload

    vitals = _day_change(ticker)
    if not vitals:
        payload = {
            "status": "unavailable",
            "sector": sector,
            "ticker": ticker,
            "reason": "Upstream market data provider returned no rows.",
        }
        _cache[key] = CachedSectorData(time.time(), payload)
        return payload

    payload = {
        "status": "ok",
        "sector": sector,
        "ticker": ticker,
        "vitals": vitals,
        "benchmark": _day_change(BENCHMARK_TICKER),
        "fifty_two_week": _52_week_range(ticker),
        "trend": _monthly_series(ticker),
        "captured_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _cache[key] = CachedSectorData(time.time(), payload)
    return payload
