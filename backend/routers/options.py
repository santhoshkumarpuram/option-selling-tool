"""Options and Strategy execution router."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional, Tuple
from services.broker_service import get_option_chain_for_symbol, filter_dsrd_strikes
from services.strategy_builder import build_option_strategy
from services.ta_engine import fetch_stock_ta
from db.database import create_position, get_active_credentials, get_setting
import json
from datetime import datetime, timezone, timedelta


def get_market_hours_status() -> Tuple[bool, str]:
    """Check if Indian National Stock Exchange (NSE) is open for live F&O orders."""
    now_utc = datetime.now(timezone.utc)
    ist = now_utc + timedelta(hours=5, minutes=30)
    weekday = ist.weekday()  # 0=Monday, ..., 5=Saturday, 6=Sunday

    if weekday >= 5:
        day_name = "Saturday" if weekday == 5 else "Sunday"
        return False, f"NSE Market is CLOSED today ({day_name}). Regular live broker orders cannot be executed on weekends. NSE F&O trading hours are Monday to Friday, 9:15 AM to 3:30 PM IST."

    market_open = ist.replace(hour=9, minute=15, second=0, microsecond=0)
    market_close = ist.replace(hour=15, minute=30, second=0, microsecond=0)

    if ist < market_open:
        return False, f"NSE Pre-Market: Market opens at 9:15 AM IST (Current time: {ist.strftime('%I:%M %p IST')}). Live orders cannot be placed yet."
    elif ist > market_close:
        return False, f"NSE Market is CLOSED for today (closed at 3:30 PM IST. Current time: {ist.strftime('%I:%M %p IST')}). Regular live orders cannot be executed now."

    return True, "Market is OPEN"


router = APIRouter(prefix="/api/options", tags=["options"])


class CustomStrategyRequest(BaseModel):
    symbol: str
    strategy_type: str
    lots: int = 1
    stop_loss_rule: str = "1:2"
    expiry: Optional[str] = None


class PlaceOrderRequest(BaseModel):
    symbol: str
    strategy_type: str
    expiry: str
    legs: List[Dict[str, Any]]
    lots: int = 1
    lot_size: int = 250
    net_credit: float
    max_profit: float
    max_loss: float
    pop: float
    stop_loss_rule: str = "1:2"
    is_paper: bool = True


@router.get("/chain/{symbol}")
async def get_option_chain(symbol: str, expiry: Optional[str] = None):
    """Fetch option chain with Greeks."""
    ta = await fetch_stock_ta(symbol)
    cmp = ta.get("cmp", 1000.0)
    return await get_option_chain_for_symbol(symbol, cmp, expiry)


@router.post("/strategy")
async def calculate_custom_strategy(req: CustomStrategyRequest):
    """Calculate customized option selling strategy metrics."""
    ta = await fetch_stock_ta(req.symbol)
    cmp = ta.get("cmp", 1000.0)
    chain = await get_option_chain_for_symbol(req.symbol, cmp, req.expiry)

    delta_min = float(await get_setting("delta_min", "0.07"))
    delta_max = float(await get_setting("delta_max", "0.15"))

    suggested = filter_dsrd_strikes(
        chain,
        ta.get("support_levels", []),
        ta.get("resistance_levels", []),
        delta_min=delta_min,
        delta_max=delta_max
    )

    metrics = build_option_strategy(
        strategy_type=req.strategy_type,
        symbol=req.symbol,
        cmp=cmp,
        suggested_strikes=suggested,
        chain=chain,
        support_levels=ta.get("support_levels", []),
        resistance_levels=ta.get("resistance_levels", []),
        lots=req.lots,
        stop_loss_rule=req.stop_loss_rule
    )
    return metrics


@router.post("/order")
async def place_order(req: PlaceOrderRequest):
    """Execute trade (paper or real broker order)."""
    if not req.is_paper:
        creds = await get_active_credentials()
        if not creds:
            raise HTTPException(
                status_code=400,
                detail="No active broker credentials found. Please connect your Dhan account in Settings before placing live orders."
            )

        # Check if exchange is currently open
        is_open, market_msg = get_market_hours_status()
        if not is_open:
            raise HTTPException(
                status_code=400,
                detail=f"{market_msg}\n\nTip: Click 'Execute Paper Trade' to test and track this strategy, or place the live order when the market opens."
            )

        order_mode = "real"
        # If real order, call Dhan order placement API
        if creds.get("broker") == "dhan":
            try:
                from dhanhq import dhanhq, DhanContext
                ctx = DhanContext(str(creds["client_id"]), creds["access_token"])
                dhan = dhanhq(ctx)

                funds = dhan.get_fund_limits()
                if funds.get("status") == "failure":
                    err_msg = funds.get("remarks", {}).get("error_message", "Failed to verify Dhan account credentials.")
                    raise HTTPException(status_code=400, detail=f"Dhan Account Verification Error: {err_msg}")

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Broker Order Error: {str(e)}")
    else:
        order_mode = "paper"

    pos_data = {
        "symbol": req.symbol.upper(),
        "strategy_type": req.strategy_type,
        "expiry": req.expiry,
        "legs_json": json.dumps(req.legs),
        "lots": req.lots,
        "lot_size": req.lot_size,
        "entry_date": datetime.now().strftime("%Y-%m-%d"),
        "entry_stock_price": 0.0,
        "is_paper": 1 if order_mode == "paper" else 0,
        "status": "open",
        "net_credit": req.net_credit,
        "max_profit": req.max_profit,
        "max_loss": req.max_loss,
        "pop_at_entry": req.pop,
        "stop_loss_rule": req.stop_loss_rule,
        "current_pnl": 0.0
    }

    pos_id = await create_position(pos_data)

    return {
        "status": "success",
        "position_id": pos_id,
        "mode": order_mode,
        "message": f"Successfully placed {req.strategy_type} trade ({order_mode.upper()})"
    }
