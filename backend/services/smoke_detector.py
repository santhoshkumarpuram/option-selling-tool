"""Smoke Detector — 3-Point Reversal Early Warning System.

Detects:
1. Bollinger Squeeze (band narrowing indicates imminent explosive move).
2. RSI Divergence (momentum weakening before price turnaround).
3. Candlestick Reversal Patterns (engulfing, stars, hammers).

Confluence score:
0/3: Clear skies
1/3: Low warning (watch)
2/3: Moderate warning (get alert)
3/3: High danger (prepare to exit or do not enter)
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple
from services.ta_engine import calculate_rsi


def check_bollinger_squeeze(df: pd.DataFrame, period: int = 20, num_std: float = 2.0) -> Tuple[str, str]:
    """Check if Bollinger Bands are in a squeeze or experiencing a breakout."""
    if len(df) < period + 10:
        return "inactive", "Insufficient data for Bollinger Bands"

    close = df['Close']
    sma = close.rolling(window=period).mean()
    std = close.rolling(window=period).std()
    upper = sma + (std * num_std)
    lower = sma - (std * num_std)
    bandwidth = (upper - lower) / sma.replace(0, np.nan)

    curr_bw = float(bandwidth.iloc[-1])
    recent_bw = bandwidth.dropna().iloc[-50:] if len(bandwidth.dropna()) >= 50 else bandwidth.dropna()
    min_bw = float(recent_bw.min())
    threshold_squeeze = float(recent_bw.quantile(0.18))

    curr_close = float(close.iloc[-1])
    curr_upper = float(upper.iloc[-1])
    curr_lower = float(lower.iloc[-1])

    if curr_bw <= threshold_squeeze:
        return "active", f"Bands narrowing (Bandwidth {curr_bw:.3f}) — High volatility expansion imminent"

    if curr_close >= curr_upper:
        return "active", f"Price pierced Upper Band (₹{curr_upper:.1f}) — Danger for sold Call positions"
    
    if curr_close <= curr_lower:
        return "active", f"Price pierced Lower Band (₹{curr_lower:.1f}) — Danger for sold Put positions"

    return "inactive", f"Normal band width ({curr_bw:.2f}), price inside channel"


def check_rsi_divergence(df: pd.DataFrame, lookback: int = 25) -> Tuple[str, str]:
    """Detect Bullish or Bearish RSI divergence in recent bars."""
    if len(df) < lookback + 14:
        return "inactive", "No active divergence in recent 20 bars"

    closes = df['Close'].iloc[-lookback:].values
    rsi = calculate_rsi(df['Close'], period=14).iloc[-lookback:].values

    # Check local peaks/valleys
    high_idx = []
    low_idx = []
    for i in range(2, len(closes) - 2):
        if closes[i] > closes[i-1] and closes[i] > closes[i-2] and closes[i] > closes[i+1] and closes[i] > closes[i+2]:
            high_idx.append(i)
        if closes[i] < closes[i-1] and closes[i] < closes[i-2] and closes[i] < closes[i+1] and closes[i] < closes[i+2]:
            low_idx.append(i)

    # Check Bearish Divergence (Price higher high, RSI lower high)
    if len(high_idx) >= 2:
        i1, i2 = high_idx[-2], high_idx[-1]
        if closes[i2] > closes[i1] and rsi[i2] < rsi[i1]:
            return "active", f"Bearish divergence detected: price made higher high, RSI lost momentum ({rsi[i1]:.1f} → {rsi[i2]:.1f})"

    # Check Bullish Divergence (Price lower low, RSI higher low)
    if len(low_idx) >= 2:
        i1, i2 = low_idx[-2], low_idx[-1]
        if closes[i2] < closes[i1] and rsi[i2] > rsi[i1]:
            return "active", f"Bullish divergence detected: price made lower low, RSI gaining strength ({rsi[i1]:.1f} → {rsi[i2]:.1f})"

    return "inactive", "No divergence active in last 20 bars"


def check_candlestick_patterns(df: pd.DataFrame) -> Tuple[str, str]:
    """Detect key reversal candlestick patterns on recent daily candles."""
    if len(df) < 5:
        return "inactive", "No reversal pattern in last 10 days"

    # Last 3 candles
    c1 = df.iloc[-3]
    c2 = df.iloc[-2]
    c3 = df.iloc[-1]

    # Helper functions
    def is_bullish(c): return c['Close'] > c['Open']
    def is_bearish(c): return c['Close'] < c['Open']
    def body(c): return abs(c['Close'] - c['Open'])
    def upper_wick(c): return c['High'] - max(c['Open'], c['Close'])
    def lower_wick(c): return min(c['Open'], c['Close']) - c['Low']

    # 1. Bearish Engulfing
    if is_bullish(c2) and is_bearish(c3):
        if c3['Open'] >= c2['Close'] and c3['Close'] <= c2['Open'] and body(c3) > body(c2):
            return "active", "Bearish Engulfing pattern formed on daily chart"

    # 2. Bullish Engulfing
    if is_bearish(c2) and is_bullish(c3):
        if c3['Open'] <= c2['Close'] and c3['Close'] >= c2['Open'] and body(c3) > body(c2):
            return "active", "Bullish Engulfing pattern formed on daily chart"

    # 3. Shooting Star (Bearish)
    if upper_wick(c3) >= 2 * body(c3) and lower_wick(c3) <= 0.3 * body(c3):
        return "active", "Shooting Star reversal candle detected"

    # 4. Hammer (Bullish)
    if lower_wick(c3) >= 2 * body(c3) and upper_wick(c3) <= 0.3 * body(c3):
        return "active", "Hammer bottom-reversal candle detected"

    # 5. Evening Star (Bearish 3-candle)
    if is_bullish(c1) and body(c2) < body(c1) * 0.35 and is_bearish(c3) and c3['Close'] < (c1['Open'] + c1['Close']) / 2:
        return "active", "Evening Star reversal cluster formed"

    # 6. Morning Star (Bullish 3-candle)
    if is_bearish(c1) and body(c2) < body(c1) * 0.35 and is_bullish(c3) and c3['Close'] > (c1['Open'] + c1['Close']) / 2:
        return "active", "Morning Star reversal cluster formed"

    return "inactive", "No high-probability reversal candle in last 5 days"


def evaluate_smoke_detector(df_daily: pd.DataFrame) -> Dict[str, Any]:
    """Run full 3-point smoke detector audit."""
    bb_status, bb_detail = check_bollinger_squeeze(df_daily)
    rsi_status, rsi_detail = check_rsi_divergence(df_daily)
    candle_status, candle_detail = check_candlestick_patterns(df_daily)

    score = sum([
        1 if bb_status == "active" else 0,
        1 if rsi_status == "active" else 0,
        1 if candle_status == "active" else 0,
    ])

    return {
        "bollinger": bb_status,
        "bollinger_detail": bb_detail,
        "rsi_divergence": rsi_status,
        "rsi_divergence_detail": rsi_detail,
        "candlestick": candle_status,
        "candlestick_detail": candle_detail,
        "score": score
    }
