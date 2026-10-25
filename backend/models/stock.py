"""Pydantic models for stock and analysis data."""

from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class RSIZone(str, Enum):
    BULLISH = "Bullish"
    BEARISH = "Bearish"
    NEUTRAL = "Neutral"


class Signal(str, Enum):
    STRONG_BULLISH = "Strong Bullish"
    STRONG_BEARISH = "Strong Bearish"
    BULLISH_PULLBACK = "Bullish Pullback"
    BEARISH_BOUNCE = "Bearish Bounce"
    SIDEWAYS = "Sideways"
    WAIT = "Wait"


class Strategy(str, Enum):
    HEDGE_PUT = "hedge_put"
    HEDGE_CALL = "hedge_call"
    IRON_CONDOR = "iron_condor"
    WAIT = "wait"


class SRLevel(BaseModel):
    price: float
    timeframe: str  # "D", "W", "M", "D+W", "D+W+M"
    touches: int
    level_type: str  # "support" or "resistance"


class SmokeDetector(BaseModel):
    bollinger: str = "inactive"  # "active" or "inactive"
    bollinger_detail: str = "No squeeze detected"
    rsi_divergence: str = "inactive"
    rsi_divergence_detail: str = "No active divergence"
    candlestick: str = "inactive"
    candlestick_detail: str = "No reversal pattern"
    score: int = 0  # 0-3


class StrikeInfo(BaseModel):
    type: str  # "CE" or "PE"
    strike: float
    delta: float
    premium: float
    oi: Optional[int] = None
    iv: Optional[float] = None
    aligned: bool = True  # Is it outside S/R levels?


class TradeMetrics(BaseModel):
    max_profit: float
    max_loss: float
    pop: float  # Probability of profit %
    roi: float  # Return on investment %
    breakeven: Optional[float] = None
    net_credit: Optional[float] = None
    margin_required: Optional[float] = None


class StockScanResult(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    cmp: Optional[float] = None
    weekly_rsi: Optional[float] = None
    daily_rsi: Optional[float] = None
    weekly_zone: Optional[RSIZone] = None
    daily_zone: Optional[RSIZone] = None
    signal: str = "Wait"
    strategy: str = "wait"
    smoke_score: int = 0
    has_event: bool = False


class StockAnalysis(BaseModel):
    symbol: str
    name: Optional[str] = None
    sector: Optional[str] = None
    cmp: Optional[float] = None
    weekly_rsi: Optional[float] = None
    daily_rsi: Optional[float] = None
    weekly_zone: Optional[RSIZone] = None
    daily_zone: Optional[RSIZone] = None
    signal: str = "Wait"
    recommended_strategy: str = "wait"
    support_levels: List[SRLevel] = []
    resistance_levels: List[SRLevel] = []
    suggested_strikes: List[StrikeInfo] = []
    smoke: SmokeDetector = SmokeDetector()
    trade: Optional[TradeMetrics] = None


class BrokerCredentials(BaseModel):
    broker: str  # "dhan", "fyers", "kotak"
    client_id: Optional[str] = None
    access_token: Optional[str] = None
    app_id: Optional[str] = None
    consumer_key: Optional[str] = None
    consumer_secret: Optional[str] = None
