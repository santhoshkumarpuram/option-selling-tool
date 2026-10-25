"""Multi-broker abstraction service.

Supports:
1. DhanHQ official API (Option Chain with Greeks, Real order placement)
2. FYERS & Kotak Neo interfaces (ready for credentials)
3. High-precision Black-Scholes Analytical Option Chain engine for offline / paper mode
"""

import time
import math
import scipy.stats as si
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from db.database import get_active_credentials


# Dhan Security IDs map for prominent Nifty 50 stocks & indices
DHAN_SECURITY_MAP = {
    "NIFTY": {"id": 13, "segment": "IDX_I"},
    "BANKNIFTY": {"id": 25, "segment": "IDX_I"},
    "RELIANCE": {"id": 2885, "segment": "NSE_FNO"},
    "TCS": {"id": 11536, "segment": "NSE_FNO"},
    "HDFCBANK": {"id": 1333, "segment": "NSE_FNO"},
    "INFY": {"id": 1594, "segment": "NSE_FNO"},
    "ICICIBANK": {"id": 4963, "segment": "NSE_FNO"},
    "SBIN": {"id": 3045, "segment": "NSE_FNO"},
    "BHARTIARTL": {"id": 10604, "segment": "NSE_FNO"},
    "ITC": {"id": 1660, "segment": "NSE_FNO"},
    "KOTAKBANK": {"id": 1922, "segment": "NSE_FNO"},
    "LT": {"id": 11483, "segment": "NSE_FNO"},
    "MARUTI": {"id": 10999, "segment": "NSE_FNO"},
}

_CHAIN_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}
_LAST_DHAN_CALL = 0.0


def black_scholes_greeks(S: float, K: float, T: float, r: float, sigma: float, option_type: str = "CE") -> Tuple[float, float, float]:
    """Calculate Black-Scholes Option Price, Delta, and Theta.
    
    S: Spot Price
    K: Strike Price
    T: Time to expiry in years
    r: Risk-free interest rate (e.g., 0.065 for India)
    sigma: Implied Volatility (e.g., 0.18)
    """
    if T <= 0:
        if option_type == "CE":
            return max(0.0, S - K), 1.0 if S > K else 0.0, 0.0
        else:
            return max(0.0, K - S), -1.0 if S < K else 0.0, 0.0

    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    if option_type == "CE":
        price = S * si.norm.cdf(d1, 0.0, 1.0) - K * math.exp(-r * T) * si.norm.cdf(d2, 0.0, 1.0)
        delta = si.norm.cdf(d1, 0.0, 1.0)
        theta = -(S * si.norm.pdf(d1, 0.0, 1.0) * sigma) / (2 * math.sqrt(T)) - r * K * math.exp(-r * T) * si.norm.cdf(d2, 0.0, 1.0)
    else:
        price = K * math.exp(-r * T) * si.norm.cdf(-d2, 0.0, 1.0) - S * si.norm.cdf(-d1, 0.0, 1.0)
        delta = si.norm.cdf(d1, 0.0, 1.0) - 1.0  # Put delta is negative
        theta = -(S * si.norm.pdf(d1, 0.0, 1.0) * sigma) / (2 * math.sqrt(T)) + r * K * math.exp(-r * T) * si.norm.cdf(-d2, 0.0, 1.0)

    # Convert theta to per-day decay
    theta_day = theta / 365.0
    return round(max(0.05, price), 2), round(delta, 3), round(theta_day, 2)


def get_default_strike_step(cmp: float) -> float:
    if cmp > 20000: return 100.0
    if cmp > 10000: return 100.0
    if cmp > 5000: return 50.0
    if cmp > 2000: return 20.0
    if cmp > 1000: return 10.0
    if cmp > 500: return 5.0
    return 2.5


def generate_synthetic_option_chain(symbol: str, cmp: float, expiry: Optional[str] = None) -> Dict[str, Any]:
    """Generate high-fidelity option chain with Black-Scholes Greeks."""
    step = get_default_strike_step(cmp)
    atm_strike = round(cmp / step) * step
    
    # Expiry in ~22 trading days (or last Thursday of month)
    today = datetime.now()
    days_to_expiry = 22
    t_years = days_to_expiry / 365.0
    iv = 0.18  # Typical India VIX base
    r = 0.065

    strikes_data = []
    # Generate 15 strikes up and down
    for i in range(-15, 16):
        strike = round(atm_strike + (i * step), 2)
        
        ce_price, ce_delta, ce_theta = black_scholes_greeks(cmp, strike, t_years, r, iv, "CE")
        pe_price, pe_delta, pe_theta = black_scholes_greeks(cmp, strike, t_years, r, iv, "PE")

        strikes_data.append({
            "strike": strike,
            "ce": {
                "strike": strike,
                "type": "CE",
                "ltp": ce_price,
                "delta": ce_delta,
                "theta": ce_theta,
                "iv": round(iv * 100, 1),
                "oi": int(abs(ce_delta) * 120000 + 10000),
            },
            "pe": {
                "strike": strike,
                "type": "PE",
                "ltp": pe_price,
                "delta": abs(pe_delta),  # Show positive magnitude for UI
                "raw_delta": pe_delta,
                "theta": pe_theta,
                "iv": round(iv * 100, 1),
                "oi": int(abs(pe_delta) * 120000 + 10000),
            }
        })

    next_expiry = (today + timedelta(days=days_to_expiry)).strftime("%Y-%m-%d")

    return {
        "symbol": symbol.upper(),
        "cmp": cmp,
        "expiry": expiry or next_expiry,
        "expiries": [
            (today + timedelta(days=days_to_expiry)).strftime("%Y-%m-%d"),
            (today + timedelta(days=days_to_expiry + 28)).strftime("%Y-%m-%d"),
        ],
        "strikes": strikes_data,
        "source": "synthetic"
    }


async def fetch_option_chain_from_dhan(creds: Dict[str, Any], symbol: str, cmp: float, expiry: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Fetch live option chain from Dhan API with rate-limiting safeguard."""
    global _LAST_DHAN_CALL
    try:
        from dhanhq import dhanhq, DhanContext
        client_id = creds.get("client_id")
        access_token = creds.get("access_token")

        if not client_id or not access_token:
            return None

        # Auto-extract dhanClientId from JWT if needed
        if access_token and (not client_id or len(str(client_id)) > 10):
            try:
                import json, base64
                parts = access_token.split(".")
                if len(parts) >= 2:
                    padding = "=" * (4 - len(parts[1]) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(parts[1] + padding))
                    token_client_id = payload.get("dhanClientId")
                    if token_client_id:
                        client_id = str(token_client_id)
            except Exception:
                pass

        # Rate limit enforcement (1 request per 3s for option chain)
        now = time.time()
        elapsed = now - _LAST_DHAN_CALL
        if elapsed < 3.0:
            time.sleep(3.0 - elapsed)
        _LAST_DHAN_CALL = time.time()

        ctx = DhanContext(str(client_id), access_token)
        dhan = dhanhq(ctx)
        sec_info = DHAN_SECURITY_MAP.get(symbol.upper(), {"id": 13, "segment": "IDX_I"})

        # Use next active expiry if none provided
        active_expiry = expiry or (datetime.now() + timedelta(days=22)).strftime("%Y-%m-%d")

        resp = dhan.option_chain(
            under_security_id=sec_info["id"],
            under_exchange_segment=sec_info["segment"],
            expiry=active_expiry
        )

        if resp.get("status") == "success" and "data" in resp:
            data = resp["data"]
            live_cmp = data.get("last_price", cmp)
            oc_map = data.get("oc", {})

            strikes_data = []
            for strike_str, details in sorted(oc_map.items(), key=lambda x: float(x[0])):
                strike = float(strike_str)
                ce = details.get("ce", {})
                pe = details.get("pe", {})
                ce_greeks = ce.get("greeks", {})
                pe_greeks = pe.get("greeks", {})

                strikes_data.append({
                    "strike": strike,
                    "ce": {
                        "strike": strike,
                        "type": "CE",
                        "ltp": ce.get("last_price", 0.0),
                        "delta": round(float(ce_greeks.get("delta", 0.0)), 3),
                        "theta": round(float(ce_greeks.get("theta", 0.0)), 2),
                        "iv": round(float(ce.get("implied_volatility", 0.0)), 1),
                        "oi": ce.get("oi", 0)
                    },
                    "pe": {
                        "strike": strike,
                        "type": "PE",
                        "ltp": pe.get("last_price", 0.0),
                        "delta": round(abs(float(pe_greeks.get("delta", 0.0))), 3),
                        "raw_delta": round(float(pe_greeks.get("delta", 0.0)), 3),
                        "theta": round(float(pe_greeks.get("theta", 0.0)), 2),
                        "iv": round(float(pe.get("implied_volatility", 0.0)), 1),
                        "oi": pe.get("oi", 0)
                    }
                })

            return {
                "symbol": symbol.upper(),
                "cmp": live_cmp,
                "expiry": active_expiry,
                "strikes": strikes_data,
                "source": "dhan_live"
            }
        else:
            remarks = resp.get("data", "") or resp.get("remarks", "")
            print(f"Dhan option chain notice ({symbol}): {remarks} - using analytical Black-Scholes Greeks engine")
            return None
    except Exception as e:
        print(f"Dhan option chain exception: {e}")
        return None


async def get_option_chain_for_symbol(symbol: str, cmp: float, expiry: Optional[str] = None) -> Dict[str, Any]:
    """Get option chain from active broker or fall back to synthetic engine."""
    cache_key = f"{symbol.upper()}_{expiry or 'default'}"
    if cache_key in _CHAIN_CACHE:
        ts, cached = _CHAIN_CACHE[cache_key]
        if time.time() - ts < 60:  # 1 min cache
            return cached

    active_creds = await get_active_credentials()
    if active_creds and active_creds.get("broker") == "dhan":
        live_chain = await fetch_option_chain_from_dhan(active_creds, symbol, cmp, expiry)
        if live_chain:
            _CHAIN_CACHE[cache_key] = (time.time(), live_chain)
            return live_chain

    # Fallback to high-precision synthetic engine
    synthetic_chain = generate_synthetic_option_chain(symbol, cmp, expiry)
    _CHAIN_CACHE[cache_key] = (time.time(), synthetic_chain)
    return synthetic_chain


def filter_dsrd_strikes(
    chain: Dict[str, Any],
    support_levels: List[Dict[str, Any]],
    resistance_levels: List[Dict[str, Any]],
    delta_min: float = 0.07,
    delta_max: float = 0.15
) -> List[Dict[str, Any]]:
    """Filter strikes matching Sanjay Kathuria's DSRD Delta range (0.07 - 0.15)
    and tag whether they lie outside the railway tracks (S/R boundaries).
    """
    key_support = support_levels[0]["price"] if support_levels else 0.0
    key_resistance = resistance_levels[0]["price"] if resistance_levels else 999999.0

    suggested = []
    for item in chain.get("strikes", []):
        ce = item["ce"]
        pe = item["pe"]

        # Call Strike check (for Bear Call / Iron Condor)
        if delta_min <= ce["delta"] <= delta_max:
            # Safe if strike >= Resistance (outside railway track)
            is_aligned = ce["strike"] >= key_resistance
            suggested.append({
                "type": "CE",
                "strike": ce["strike"],
                "delta": ce["delta"],
                "premium": ce["ltp"],
                "oi": ce.get("oi", 0),
                "iv": ce.get("iv", 0),
                "aligned": is_aligned,
                "status_label": "Safe (Outside Track)" if is_aligned else "Inside Track (Risky)"
            })

        # Put Strike check (for Bull Put / Iron Condor)
        if delta_min <= pe["delta"] <= delta_max:
            # Safe if strike <= Support (outside railway track)
            is_aligned = pe["strike"] <= key_support
            suggested.append({
                "type": "PE",
                "strike": pe["strike"],
                "delta": pe["delta"],
                "premium": pe["ltp"],
                "oi": pe.get("oi", 0),
                "iv": pe.get("iv", 0),
                "aligned": is_aligned,
                "status_label": "Safe (Outside Track)" if is_aligned else "Inside Track (Risky)"
            })

    return suggested
