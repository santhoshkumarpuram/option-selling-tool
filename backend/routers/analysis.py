"""Analysis router returning complete DSRD breakdown for a selected stock."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from services.ta_engine import fetch_stock_ta
from services.smoke_detector import evaluate_smoke_detector
from services.broker_service import get_option_chain_for_symbol, filter_dsrd_strikes
from services.strategy_builder import build_option_strategy
from db.database import get_setting


router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/{symbol}")
async def get_stock_analysis(symbol: str):
    """Run complete DSRD checklist for symbol."""
    sym = symbol.upper().strip()
    
    # 1. Technical Analysis (Direction + S/R)
    ta = await fetch_stock_ta(sym)
    df_daily = ta.pop("_df_daily", None)
    cmp = ta.get("cmp", 1000.0)

    # 2. Smoke Detector (3-point warning)
    if df_daily is not None:
        smoke = evaluate_smoke_detector(df_daily)
    else:
        smoke = {
            "bollinger": "inactive",
            "bollinger_detail": "No squeeze detected",
            "rsi_divergence": "inactive",
            "rsi_divergence_detail": "No active divergence in last 20 bars",
            "candlestick": "inactive",
            "candlestick_detail": "No reversal candle detected",
            "score": 0
        }

    # 3. Option Chain & Delta-Based Strike Picking (0.07 - 0.15 Delta)
    delta_min = float(await get_setting("delta_min", "0.07"))
    delta_max = float(await get_setting("delta_max", "0.15"))
    sl_rule = await get_setting("stop_loss_rule", "1:2")

    chain = await get_option_chain_for_symbol(sym, cmp)
    suggested_strikes = filter_dsrd_strikes(
        chain,
        ta.get("support_levels", []),
        ta.get("resistance_levels", []),
        delta_min=delta_min,
        delta_max=delta_max
    )

    # 4. Strategy Recommendation & Payoffs
    rec_strategy = ta.get("strategy", "wait")
    trade_metrics = None
    if rec_strategy != "wait":
        trade_metrics = build_option_strategy(
            strategy_type=rec_strategy,
            symbol=sym,
            cmp=cmp,
            suggested_strikes=suggested_strikes,
            chain=chain,
            support_levels=ta.get("support_levels", []),
            resistance_levels=ta.get("resistance_levels", []),
            lots=1,
            stop_loss_rule=sl_rule
        )

    return {
        "symbol": sym,
        "name": ta.get("name", sym),
        "sector": ta.get("sector", "Equity"),
        "cmp": cmp,
        "weekly_rsi": ta.get("weekly_rsi"),
        "daily_rsi": ta.get("daily_rsi"),
        "weekly_zone": ta.get("weekly_zone"),
        "daily_zone": ta.get("daily_zone"),
        "signal": ta.get("signal"),
        "recommended_strategy": rec_strategy,
        "support_levels": ta.get("support_levels", []),
        "resistance_levels": ta.get("resistance_levels", []),
        "suggested_strikes": suggested_strikes,
        "smoke": smoke,
        "trade": trade_metrics,
        "expiry": chain.get("expiry"),
        "available_expiries": chain.get("expiries", [])
    }
