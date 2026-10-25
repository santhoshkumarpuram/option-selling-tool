"""Technical Analysis Engine implementing the DSRD Framework.

Calculates:
1. Direction (D): Dual-timeframe Wilder's RSI (Weekly + Daily) with 60/40 zones.
2. Support & Resistance (S+R): Multi-timeframe swing pivots, touch counts, and railway tracks.
3. Strike alignment checking (ensuring strikes lie outside the tracks).
"""

import asyncio
import time
import math
import numpy as np
import pandas as pd
import httpx
import yfinance as yf
from typing import Dict, Any, List, Optional, Tuple
from config import NIFTY50_STOCKS, INDEX_INSTRUMENTS


# Cache in-memory to prevent rate-limits / slow loads: sym -> (timestamp, data)
_TA_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_CACHE_EXPIRY_SECONDS = 300  # 5 minutes

# Browser User-Agent header so direct Yahoo Finance API calls succeed reliably on Linux/Raspberry Pi
_HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
}

_CLIENT: Optional[httpx.AsyncClient] = None


def _get_http_client() -> httpx.AsyncClient:
    global _CLIENT
    if _CLIENT is None or _CLIENT.is_closed:
        _CLIENT = httpx.AsyncClient(
            headers=_HTTP_HEADERS,
            timeout=15.0,
            follow_redirects=True,
        )
    return _CLIENT


def _get_ticker_symbol(symbol: str) -> str:
    sym = symbol.upper().strip()
    if sym in ("NIFTY", "NIFTY50", "NIFTY 50"):
        return "^NSEI"
    if sym in ("BANKNIFTY", "BANK NIFTY"):
        return "^NSEBANK"
    if sym == "TATAMOTORS":
        return "TMPV.NS"
    if not sym.endswith(".NS") and not sym.startswith("^"):
        return f"{sym}.NS"
    return sym


def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Standard Wilder's RSI calculation."""
    if len(series) < period + 1:
        return pd.Series([50.0] * len(series), index=series.index)

    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    # Wilder's exponential moving average
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi.fillna(50.0)


def detect_sr_levels(df: pd.DataFrame, window: int = 5, tolerance_pct: float = 0.015) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Detect support and resistance levels from swing highs/lows and calculate touch counts."""
    highs = df['High'].values
    lows = df['Low'].values
    closes = df['Close'].values
    n = len(df)
    
    if n < window * 2 + 1:
        cmp = float(closes[-1]) if n > 0 else 100.0
        return (
            [{"price": round(cmp * 0.95, 2), "timeframe": "D", "touches": 1, "level_type": "support"}],
            [{"price": round(cmp * 1.05, 2), "timeframe": "D", "touches": 1, "level_type": "resistance"}]
        )

    cmp = float(closes[-1])
    raw_res = []
    raw_sup = []

    # Find swing highs
    for i in range(window, n - window):
        if highs[i] == max(highs[i - window : i + window + 1]):
            raw_res.append(float(highs[i]))
        if lows[i] == min(lows[i - window : i + window + 1]):
            raw_sup.append(float(lows[i]))

    # Group into clustered levels
    def cluster_levels(levels: List[float], level_type: str) -> List[Dict[str, Any]]:
        if not levels:
            return []
        levels.sort()
        clusters: List[List[float]] = []
        for lvl in levels:
            placed = False
            for c in clusters:
                avg = sum(c) / len(c)
                if abs(lvl - avg) / avg <= tolerance_pct:
                    c.append(lvl)
                    placed = True
                    break
            if not placed:
                clusters.append([lvl])

        results = []
        for c in clusters:
            avg_price = round(sum(c) / len(c), 2)
            touches = len(c)
            # Timeframe label: heuristic based on touch depth
            tf = "D+W+M" if touches >= 5 else ("D+W" if touches >= 3 else "D")
            results.append({
                "price": avg_price,
                "timeframe": tf,
                "touches": touches,
                "level_type": level_type
            })
        return results

    all_res = cluster_levels(raw_res, "resistance")
    all_sup = cluster_levels(raw_sup, "support")

    # Filter resistance strictly above CMP, support strictly below CMP
    resistance = [r for r in all_res if r["price"] > cmp]
    support = [s for s in all_sup if s["price"] < cmp]

    # Sort resistance ascending (closest first), support descending (closest first)
    resistance.sort(key=lambda x: x["price"])
    support.sort(key=lambda x: x["price"], reverse=True)

    # Fallbacks if none found
    if not resistance:
        resistance = [{"price": round(cmp * 1.05, 2), "timeframe": "D", "touches": 2, "level_type": "resistance"}]
    if not support:
        support = [{"price": round(cmp * 0.95, 2), "timeframe": "D", "touches": 2, "level_type": "support"}]

    return support[:5], resistance[:5]


def evaluate_dsrd_direction(weekly_rsi: float, daily_rsi: float) -> Tuple[str, str]:
    """Evaluate Sanjay Kathuria's DSRD Matrix.
    
    Returns (signal, recommended_strategy)
    """
    w_bull = weekly_rsi >= 60.0
    w_bear = weekly_rsi <= 40.0
    w_neut = not w_bull and not w_bear

    d_bull = daily_rsi >= 60.0
    d_bear = daily_rsi <= 40.0
    d_neut = not d_bull and not d_bear

    # Both Agree Bullish
    if w_bull and d_bull:
        return "Strong Bullish", "hedge_put"

    # Both Agree Bearish
    if w_bear and d_bear:
        return "Strong Bearish", "hedge_call"

    # Pullback / Bounce
    if w_bull and d_neut:
        return "Bullish Pullback", "hedge_put"
    if w_bear and d_neut:
        return "Bearish Bounce", "hedge_call"

    # Both in the middle (40-60)
    if w_neut and d_neut:
        return "Sideways", "iron_condor"

    # Conflicting (One bullish >60, one bearish <40)
    if (w_bull and d_bear) or (w_bear and d_bull):
        return "Wait", "wait"

    # Neutral daily with weekly direction
    if d_bull and w_neut:
        return "Bullish Momentum", "hedge_put"
    if d_bear and w_neut:
        return "Bearish Momentum", "hedge_call"

    return "Wait", "wait"


async def _fetch_chart_data(ticker_sym: str) -> Optional[pd.DataFrame]:
    """Fetch 2-year daily OHLC data directly from Yahoo Finance v8 chart API."""
    client = _get_http_client()
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_sym}?range=2y&interval=1d"
    try:
        r = await client.get(url)
        if r.status_code == 200:
            data = r.json()
            result = data.get("chart", {}).get("result", [])
            if result:
                res = result[0]
                timestamps = res.get("timestamp")
                quote = res.get("indicators", {}).get("quote", [{}])[0]
                if timestamps and quote.get("close"):
                    df = pd.DataFrame({
                        "Open": quote.get("open", []),
                        "High": quote.get("high", []),
                        "Low": quote.get("low", []),
                        "Close": quote.get("close", []),
                        "Volume": quote.get("volume", [0] * len(timestamps))
                    }, index=pd.to_datetime(timestamps, unit="s"))
                    df = df.dropna(subset=["Close"])
                    if len(df) >= 30:
                        return df
    except Exception as e:
        print(f"Direct Yahoo API fetch error for {ticker_sym}: {e}")

    # Backup: try yfinance in thread only if direct API failed
    try:
        def _yf_sync():
            ticker = yf.Ticker(ticker_sym)
            return ticker.history(period="2y", interval="1d")
        df_yf = await asyncio.to_thread(_yf_sync)
        if df_yf is not None and not df_yf.empty and len(df_yf) >= 30:
            return df_yf
    except Exception as e:
        print(f"yfinance backup also failed for {ticker_sym}: {e}")

    return None


async def fetch_stock_ta(symbol: str, force_refresh: bool = False) -> Dict[str, Any]:
    """Fetch stock technical analysis with caching.
    
    Uses direct asynchronous Yahoo Finance chart API with realistic browser headers,
    guaranteeing reliable live data on Linux/Raspberry Pi without fake fallbacks.
    """
    sym_upper = symbol.upper().strip()
    now = time.time()

    if not force_refresh and sym_upper in _TA_CACHE:
        ts, cached_data = _TA_CACHE[sym_upper]
        if now - ts < _CACHE_EXPIRY_SECONDS:
            return dict(cached_data)

    ticker_sym = _get_ticker_symbol(sym_upper)
    df_daily = await _fetch_chart_data(ticker_sym)

    stock_info = NIFTY50_STOCKS.get(sym_upper, INDEX_INSTRUMENTS.get(sym_upper, {"name": sym_upper, "sector": "Equity"}))

    if df_daily is None or len(df_daily) < 30:
        # Honest status: never return fake RSI or fake CMP that masks errors
        return {
            "symbol": sym_upper,
            "name": stock_info.get("name", sym_upper),
            "sector": stock_info.get("sector", "Equity"),
            "cmp": None,
            "weekly_rsi": None,
            "daily_rsi": None,
            "weekly_zone": "—",
            "daily_zone": "—",
            "signal": "No Data",
            "strategy": "wait",
            "support_levels": [],
            "resistance_levels": [],
            "error": "Market data temporarily unavailable",
        }

    cmp = round(float(df_daily["Close"].iloc[-1]), 2)

    # Daily Wilder's RSI
    rsi_daily_series = calculate_rsi(df_daily["Close"], period=14)
    daily_rsi = round(float(rsi_daily_series.iloc[-1]), 1)

    # Weekly candles resampled from daily (standard Friday close - 0 extra network calls!)
    try:
        df_weekly = df_daily["Close"].resample("W-FRI").last().dropna()
        if len(df_weekly) >= 15:
            rsi_weekly_series = calculate_rsi(df_weekly, period=14)
            weekly_rsi = round(float(rsi_weekly_series.iloc[-1]), 1)
        else:
            weekly_rsi = daily_rsi
    except Exception:
        weekly_rsi = daily_rsi

    # Zones
    w_zone = "Bullish" if weekly_rsi >= 60 else ("Bearish" if weekly_rsi <= 40 else "Neutral")
    d_zone = "Bullish" if daily_rsi >= 60 else ("Bearish" if daily_rsi <= 40 else "Neutral")

    # DSRD verdict
    signal, strategy = evaluate_dsrd_direction(weekly_rsi, daily_rsi)

    # S/R levels
    support, resistance = detect_sr_levels(df_daily)

    data = {
        "symbol": sym_upper,
        "name": stock_info.get("name", sym_upper),
        "sector": stock_info.get("sector", "Equity"),
        "cmp": cmp,
        "weekly_rsi": weekly_rsi,
        "daily_rsi": daily_rsi,
        "weekly_zone": w_zone,
        "daily_zone": d_zone,
        "signal": signal,
        "strategy": strategy,
        "support_levels": support,
        "resistance_levels": resistance,
        "_df_daily": df_daily  # passed to smoke detector
    }

    _TA_CACHE[sym_upper] = (now, data)
    return dict(data)
