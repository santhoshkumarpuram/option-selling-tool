"""Application configuration and constants."""

from pydantic_settings import BaseSettings
from pathlib import Path
from typing import Optional


class Settings(BaseSettings):
    """App settings, loaded from environment or .env file."""

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True

    # Database
    db_path: str = str(Path(__file__).parent / "db" / "optionsell.db")

    # Default trading parameters
    default_delta_min: float = 0.07
    default_delta_max: float = 0.15
    default_stop_loss_rule: str = "1:2"  # "1:1", "1:2", "1:3"

    # Active broker (dhan, fyers, kotak)
    active_broker: Optional[str] = None

    model_config = {"env_prefix": "OPTSELL_", "env_file": ".env"}


settings = Settings()


# Nifty 50 stock list with sectors
NIFTY50_STOCKS = {
    "RELIANCE": {"name": "Reliance Industries", "sector": "Oil & Gas"},
    "TCS": {"name": "Tata Consultancy Services", "sector": "IT"},
    "HDFCBANK": {"name": "HDFC Bank", "sector": "Banking"},
    "INFY": {"name": "Infosys", "sector": "IT"},
    "ICICIBANK": {"name": "ICICI Bank", "sector": "Banking"},
    "HINDUNILVR": {"name": "Hindustan Unilever", "sector": "FMCG"},
    "SBIN": {"name": "State Bank of India", "sector": "Banking"},
    "BHARTIARTL": {"name": "Bharti Airtel", "sector": "Telecom"},
    "ITC": {"name": "ITC", "sector": "FMCG"},
    "KOTAKBANK": {"name": "Kotak Mahindra Bank", "sector": "Banking"},
    "LT": {"name": "Larsen & Toubro", "sector": "Infrastructure"},
    "AXISBANK": {"name": "Axis Bank", "sector": "Banking"},
    "BAJFINANCE": {"name": "Bajaj Finance", "sector": "NBFC"},
    "MARUTI": {"name": "Maruti Suzuki", "sector": "Auto"},
    "TITAN": {"name": "Titan Company", "sector": "Consumer"},
    "ASIANPAINT": {"name": "Asian Paints", "sector": "Paints"},
    "SUNPHARMA": {"name": "Sun Pharmaceutical", "sector": "Pharma"},
    "TATAMOTORS": {"name": "Tata Motors", "sector": "Auto"},
    "WIPRO": {"name": "Wipro", "sector": "IT"},
    "ULTRACEMCO": {"name": "UltraTech Cement", "sector": "Cement"},
    "HCLTECH": {"name": "HCL Technologies", "sector": "IT"},
    "BAJAJFINSV": {"name": "Bajaj Finserv", "sector": "NBFC"},
    "NTPC": {"name": "NTPC", "sector": "Power"},
    "POWERGRID": {"name": "Power Grid Corp", "sector": "Power"},
    "TATASTEEL": {"name": "Tata Steel", "sector": "Metals"},
    "NESTLEIND": {"name": "Nestle India", "sector": "FMCG"},
    "TECHM": {"name": "Tech Mahindra", "sector": "IT"},
    "M&M": {"name": "Mahindra & Mahindra", "sector": "Auto"},
    "ADANIENT": {"name": "Adani Enterprises", "sector": "Conglomerate"},
    "ADANIPORTS": {"name": "Adani Ports", "sector": "Infrastructure"},
    "ONGC": {"name": "ONGC", "sector": "Oil & Gas"},
    "COALINDIA": {"name": "Coal India", "sector": "Mining"},
    "JSWSTEEL": {"name": "JSW Steel", "sector": "Metals"},
    "DRREDDY": {"name": "Dr. Reddy's", "sector": "Pharma"},
    "CIPLA": {"name": "Cipla", "sector": "Pharma"},
    "GRASIM": {"name": "Grasim Industries", "sector": "Cement"},
    "DIVISLAB": {"name": "Divi's Laboratories", "sector": "Pharma"},
    "BPCL": {"name": "BPCL", "sector": "Oil & Gas"},
    "BRITANNIA": {"name": "Britannia Industries", "sector": "FMCG"},
    "HEROMOTOCO": {"name": "Hero MotoCorp", "sector": "Auto"},
    "APOLLOHOSP": {"name": "Apollo Hospitals", "sector": "Healthcare"},
    "EICHERMOT": {"name": "Eicher Motors", "sector": "Auto"},
    "TATACONSUM": {"name": "Tata Consumer Products", "sector": "FMCG"},
    "SBILIFE": {"name": "SBI Life Insurance", "sector": "Insurance"},
    "BAJAJ-AUTO": {"name": "Bajaj Auto", "sector": "Auto"},
    "INDUSINDBK": {"name": "IndusInd Bank", "sector": "Banking"},
    "HDFCLIFE": {"name": "HDFC Life Insurance", "sector": "Insurance"},
    "SHRIRAMFIN": {"name": "Shriram Finance", "sector": "NBFC"},
    "HINDALCO": {"name": "Hindalco Industries", "sector": "Metals"},
    "TRENT": {"name": "Trent", "sector": "Retail"},
}

# Index instruments
INDEX_INSTRUMENTS = {
    "NIFTY": {"name": "Nifty 50", "sector": "Index"},
    "BANKNIFTY": {"name": "Bank Nifty", "sector": "Index"},
}

# RSI thresholds (from the DSRD framework)
RSI_BULLISH_THRESHOLD = 60
RSI_BEARISH_THRESHOLD = 40
