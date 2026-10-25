"""Stock Scanner Router implementing Sanjay Kathuria's Nifty 50 DSRD scan."""

import asyncio
from fastapi import APIRouter
from typing import List, Dict, Any
from config import NIFTY50_STOCKS, INDEX_INSTRUMENTS
from services.ta_engine import fetch_stock_ta
from services.smoke_detector import evaluate_smoke_detector


router = APIRouter(prefix="/api/scanner", tags=["scanner"])

_SCANNER_CACHE: List[Dict[str, Any]] = []
_SCANNER_TIMESTAMP = 0.0


async def _scan_single_stock(symbol: str, info: Dict[str, str]) -> Dict[str, Any]:
    ta = await fetch_stock_ta(symbol)
    df_daily = ta.pop("_df_daily", None)
    cmp = ta.get("cmp")
    strategy = ta.get("strategy", "wait")
    support_levels = ta.get("support_levels", [])
    resistance_levels = ta.get("resistance_levels", [])
    
    smoke_score = 0
    if df_daily is not None:
        try:
            smoke = evaluate_smoke_detector(df_daily)
            smoke_score = smoke.get("score", 0)
        except Exception:
            smoke_score = 0

    # Evaluate Track & Delta Sweetspot Alignment (0.07 - 0.15 Delta strikes outside tracks)
    track_status = "—"
    track_safe = False

    if cmp and strategy != "wait":
        from services.broker_service import generate_synthetic_option_chain, filter_dsrd_strikes
        chain = generate_synthetic_option_chain(symbol, cmp)
        dsrd_strikes = filter_dsrd_strikes(chain, support_levels, resistance_levels, delta_min=0.07, delta_max=0.15)
        
        ce_safe = any(s["type"] == "CE" and s.get("aligned") for s in dsrd_strikes)
        pe_safe = any(s["type"] == "PE" and s.get("aligned") for s in dsrd_strikes)

        if strategy in ("hedge_call", "bear_call"):
            if ce_safe:
                track_status = "Safe (Outside R1)"
                track_safe = True
            else:
                track_status = "Inside Track"
                track_safe = False
        elif strategy in ("hedge_put", "bull_put"):
            if pe_safe:
                track_status = "Safe (Outside S1)"
                track_safe = True
            else:
                track_status = "Inside Track"
                track_safe = False
        elif strategy == "iron_condor":
            if ce_safe and pe_safe:
                track_status = "Safe (Both Outside)"
                track_safe = True
            elif ce_safe or pe_safe:
                track_status = "Partial (1-Side Inside)"
                track_safe = False
            else:
                track_status = "Inside Track"
                track_safe = False
    elif strategy == "wait":
        track_status = "Wait (No Signal)"
        track_safe = False

    return {
        "symbol": symbol,
        "name": info.get("name", symbol),
        "sector": info.get("sector", "Equity"),
        "cmp": cmp,
        "weekly_rsi": ta.get("weekly_rsi"),
        "daily_rsi": ta.get("daily_rsi"),
        "weekly_zone": ta.get("weekly_zone"),
        "daily_zone": ta.get("daily_zone"),
        "signal": ta.get("signal", "Wait"),
        "strategy": strategy,
        "track_status": track_status,
        "track_safe": track_safe,
        "smoke_score": smoke_score,
        "has_event": False
    }


@router.get("", response_model=List[Dict[str, Any]])
async def get_scanner_results():
    """Scan Nifty 50 stocks + indices and return DSRD status and strategy."""
    import time
    global _SCANNER_CACHE, _SCANNER_TIMESTAMP

    # Return cached results if fresher than 180 seconds
    if _SCANNER_CACHE and (time.time() - _SCANNER_TIMESTAMP < 180):
        return _SCANNER_CACHE

    tasks = []
    # Index instruments first
    for sym, info in INDEX_INSTRUMENTS.items():
        tasks.append(_scan_single_stock(sym, info))

    # Nifty 50 stocks
    for sym, info in NIFTY50_STOCKS.items():
        tasks.append(_scan_single_stock(sym, info))

    # Run in parallel batches of 10 to avoid socket saturation
    results = []
    batch_size = 10
    for i in range(0, len(tasks), batch_size):
        batch = tasks[i : i + batch_size]
        batch_results = await asyncio.gather(*batch, return_exceptions=True)
        for res in batch_results:
            if isinstance(res, dict):
                results.append(res)

    _SCANNER_CACHE = results
    _SCANNER_TIMESTAMP = time.time()
    return results


@router.post("/refresh")
async def refresh_scanner():
    """Force refresh of the scanner."""
    global _SCANNER_TIMESTAMP
    _SCANNER_TIMESTAMP = 0.0
    return await get_scanner_results()
