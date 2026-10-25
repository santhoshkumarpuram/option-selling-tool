"""Position tracker router."""

from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any, Optional
from db.database import get_positions, create_position, close_position_db
from services.ta_engine import fetch_stock_ta
from services.smoke_detector import evaluate_smoke_detector


router = APIRouter(prefix="/api/positions", tags=["positions"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_positions(status: Optional[str] = None):
    """List positions with live stock price, current P&L, and smoke warnings."""
    positions = await get_positions(status=status)

    # Enrich with live data
    enriched = []
    for pos in positions:
        try:
            ta = await fetch_stock_ta(pos["symbol"])
            cmp = ta.get("cmp", 0.0)
            df_daily = ta.pop("_df_daily", None)

            smoke_score = 0
            if df_daily is not None:
                smoke = evaluate_smoke_detector(df_daily)
                smoke_score = smoke.get("score", 0)

            # Calculate live estimated P&L
            entry_stock = pos.get("entry_stock_price") or cmp
            pnl = pos.get("current_pnl", 0.0)

            enriched.append({
                **pos,
                "stock_now": cmp,
                "smoke_score": smoke_score,
                "pnl": pnl,
                "status_ok": smoke_score < 2
            })
        except Exception:
            enriched.append(pos)

    return enriched


@router.post("/{position_id}/close")
async def close_position(position_id: int):
    """Close position and lock final P&L."""
    await close_position_db(position_id)
    return {"status": "success", "message": f"Position {position_id} closed"}
