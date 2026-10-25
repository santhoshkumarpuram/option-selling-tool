"""Pydantic models for positions."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class PositionLeg(BaseModel):
    action: str  # "SELL" or "BUY"
    option_type: str  # "CE" or "PE"
    strike: float
    premium: float
    lots: int = 1


class Position(BaseModel):
    id: Optional[int] = None
    symbol: str
    strategy_type: str  # "Bear Call", "Bull Put", "Iron Condor"
    expiry: str  # "YYYY-MM-DD"
    legs: List[PositionLeg]
    lots: int = 1
    entry_date: Optional[str] = None
    entry_stock_price: Optional[float] = None
    is_paper: bool = True  # paper vs real
    status: str = "open"  # "open", "closed"
    net_credit: Optional[float] = None
    max_profit: Optional[float] = None
    max_loss: Optional[float] = None
    pop_at_entry: Optional[float] = None
    stop_loss_rule: str = "1:2"
    pnl: float = 0.0
    closed_at: Optional[str] = None
