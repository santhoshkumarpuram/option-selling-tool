"""Strategy Builder for Hedged Option Selling.

Builds:
- Bull Put Spread (Hedge Put)
- Bear Call Spread (Hedge Call)
- Iron Condor (Both sides hedged)

Enforces CFA Sanjay Kathuria's Non-Negotiable Rules:
1. ALWAYS Outside the Railway Tracks:
   - Call Strike must be strictly >= Resistance (R1).
   - Put Strike must be strictly <= Support (S1).
   - Never sell inside the tracks! If all 0.07-0.15 delta strikes are inside the tracks,
     the engine selects the nearest safe strike at/outside the track, OR flags a
     Railway Track Violation blocking the trade.
2. Defined Risk: All positions are hedged with OTM long wings.
3. Predefined Stop-Loss (1:1, 1:2, 1:3 rules).
"""

from typing import Dict, Any, List, Optional
from services.broker_service import get_default_strike_step


# Standard NSE Lot sizes (approximate)
LOT_SIZE_MAP = {
    "NIFTY": 75,
    "BANKNIFTY": 30,
    "RELIANCE": 250,
    "TCS": 175,
    "HDFCBANK": 550,
    "INFY": 400,
    "ICICIBANK": 700,
    "SBIN": 750,
    "BHARTIARTL": 475,
    "ITC": 1600,
    "KOTAKBANK": 400,
    "LT": 175,
    "MARUTI": 50,
}


def get_lot_size(symbol: str) -> int:
    return LOT_SIZE_MAP.get(symbol.upper(), 250)


def build_option_strategy(
    strategy_type: str,
    symbol: str,
    cmp: float,
    suggested_strikes: List[Dict[str, Any]],
    chain: Dict[str, Any],
    support_levels: Optional[List[Dict[str, Any]]] = None,
    resistance_levels: Optional[List[Dict[str, Any]]] = None,
    lots: int = 1,
    stop_loss_rule: str = "1:2"
) -> Dict[str, Any]:
    """Build concrete legs and calculate payoff parameters strictly respecting railway tracks."""
    lot_size = get_lot_size(symbol)
    step = get_default_strike_step(cmp)
    strikes = chain.get("strikes", [])
    strike_map = {s["strike"]: s for s in strikes}

    key_support = support_levels[0]["price"] if support_levels else (cmp * 0.95)
    key_resistance = resistance_levels[0]["price"] if resistance_levels else (cmp * 1.05)

    # 1. Look for ALIGNED (Outside Track) strikes first in the delta sweet spot (0.07 - 0.15)
    ce_aligned = [s for s in suggested_strikes if s["type"] == "CE" and s.get("aligned") is True]
    pe_aligned = [s for s in suggested_strikes if s["type"] == "PE" and s.get("aligned") is True]

    track_violation = False
    warning_note = None

    # Helper: Find nearest strike on the full chain outside the track if no 0.07-0.15 delta is outside
    def find_nearest_safe_call():
        safe_candidates = [
            item["ce"] for item in strikes
            if item["strike"] >= key_resistance and item["ce"].get("delta", 0) > 0.02
        ]
        if safe_candidates:
            # Sort by delta descending (closest to golden delta range, but strictly >= key_resistance)
            safe_candidates.sort(key=lambda x: abs(x.get("delta", 0) - 0.10))
            best = safe_candidates[0]
            return {
                "strike": best["strike"],
                "premium": best.get("ltp", 1.0),
                "delta": best.get("delta", 0.06),
                "aligned": True,
                "adjusted": True
            }
        return None

    def find_nearest_safe_put():
        safe_candidates = [
            item["pe"] for item in strikes
            if item["strike"] <= key_support and item["pe"].get("delta", 0) > 0.02
        ]
        if safe_candidates:
            # Sort by delta descending (closest to golden delta range, but strictly <= key_support)
            safe_candidates.sort(key=lambda x: abs(x.get("delta", 0) - 0.10))
            best = safe_candidates[0]
            return {
                "strike": best["strike"],
                "premium": best.get("ltp", 1.0),
                "delta": best.get("delta", 0.06),
                "aligned": True,
                "adjusted": True
            }
        return None

    legs = []
    short_strike_ce = None
    short_strike_pe = None

    if strategy_type in ("hedge_call", "bear_call"):
        if ce_aligned:
            target = ce_aligned[0]
        else:
            # Look on full chain for first safe strike outside resistance
            safe = find_nearest_safe_call()
            if safe:
                target = safe
                warning_note = f"All 0.07–0.15 Delta strikes were inside the tracks (< R1: ₹{key_resistance}). Short Call automatically pushed outside tracks to ₹{target['strike']} CE to guarantee safety."
            else:
                # No safe strike exists — flag violation!
                target = [s for s in suggested_strikes if s["type"] == "CE"][0] if suggested_strikes else {"strike": round(cmp * 1.08 / step) * step, "premium": 2.0, "delta": 0.10}
                track_violation = True
                warning_note = f"CRITICAL: Strike ₹{target['strike']} is INSIDE the railway tracks (< Resistance ₹{key_resistance}). Sanjay Kathuria's Rule: Do NOT sell between the tracks! Trade should be skipped."

        short_k = target["strike"]
        short_prem = target["premium"]
        short_delta = target["delta"]
        short_strike_ce = short_k

        # Hedge: Buy Call 1-2 steps higher
        hedge_k = short_k + (step * 2)
        hedge_data = strike_map.get(hedge_k, {}).get("ce", {"ltp": round(short_prem * 0.35, 2), "delta": short_delta * 0.4})
        hedge_prem = hedge_data.get("ltp", round(short_prem * 0.35, 2))

        legs.append({"action": "SELL", "option_type": "CE", "strike": short_k, "premium": short_prem, "lots": lots, "is_safe": not track_violation})
        legs.append({"action": "BUY", "option_type": "CE", "strike": hedge_k, "premium": hedge_prem, "lots": lots, "is_safe": True})

        net_credit_per_share = round(max(0.05, short_prem - hedge_prem), 2)
        spread_width = hedge_k - short_k
        max_profit = round(net_credit_per_share * lot_size * lots, 2)
        max_loss = round((spread_width - net_credit_per_share) * lot_size * lots, 2)
        pop = round((1.0 - short_delta) * 100, 1)
        breakeven = round(short_k + net_credit_per_share, 2)
        approx_margin = round(spread_width * lot_size * lots * 1.2 + 25000, 2)

    elif strategy_type in ("hedge_put", "bull_put"):
        if pe_aligned:
            target = pe_aligned[0]
        else:
            safe = find_nearest_safe_put()
            if safe:
                target = safe
                warning_note = f"All 0.07–0.15 Delta strikes were inside the tracks (> S1: ₹{key_support}). Short Put automatically pushed outside tracks to ₹{target['strike']} PE to guarantee safety."
            else:
                target = [s for s in suggested_strikes if s["type"] == "PE"][0] if suggested_strikes else {"strike": round(cmp * 0.92 / step) * step, "premium": 2.0, "delta": 0.10}
                track_violation = True
                warning_note = f"CRITICAL: Strike ₹{target['strike']} is INSIDE the railway tracks (> Support ₹{key_support}). Sanjay Kathuria's Rule: Do NOT sell between the tracks! Trade should be skipped."

        short_k = target["strike"]
        short_prem = target["premium"]
        short_delta = target["delta"]
        short_strike_pe = short_k

        # Hedge: Buy Put 1-2 steps lower
        hedge_k = short_k - (step * 2)
        hedge_data = strike_map.get(hedge_k, {}).get("pe", {"ltp": round(short_prem * 0.35, 2), "delta": short_delta * 0.4})
        hedge_prem = hedge_data.get("ltp", round(short_prem * 0.35, 2))

        legs.append({"action": "SELL", "option_type": "PE", "strike": short_k, "premium": short_prem, "lots": lots, "is_safe": not track_violation})
        legs.append({"action": "BUY", "option_type": "PE", "strike": hedge_k, "premium": hedge_prem, "lots": lots, "is_safe": True})

        net_credit_per_share = round(max(0.05, short_prem - hedge_prem), 2)
        spread_width = short_k - hedge_k
        max_profit = round(net_credit_per_share * lot_size * lots, 2)
        max_loss = round((spread_width - net_credit_per_share) * lot_size * lots, 2)
        pop = round((1.0 - short_delta) * 100, 1)
        breakeven = round(short_k - net_credit_per_share, 2)
        approx_margin = round(spread_width * lot_size * lots * 1.2 + 25000, 2)

    else:  # iron_condor
        c_target = ce_aligned[0] if ce_aligned else find_nearest_safe_call()
        p_target = pe_aligned[0] if pe_aligned else find_nearest_safe_put()

        if not c_target or not p_target:
            track_violation = True
            warning_note = "Cannot find safe strikes outside both Support and Resistance boundaries for Iron Condor. Skipping trade."
            c_target = c_target or {"strike": round(cmp * 1.08 / step) * step, "premium": 3.0, "delta": 0.09}
            p_target = p_target or {"strike": round(cmp * 0.92 / step) * step, "premium": 3.0, "delta": 0.09}

        c_short = c_target["strike"]
        c_hedge = c_short + (step * 2)
        c_short_prem = c_target["premium"]
        c_hedge_prem = round(c_short_prem * 0.35, 2)

        p_short = p_target["strike"]
        p_hedge = p_short - (step * 2)
        p_short_prem = p_target["premium"]
        p_hedge_prem = round(p_short_prem * 0.35, 2)

        legs.append({"action": "SELL", "option_type": "CE", "strike": c_short, "premium": c_short_prem, "lots": lots, "is_safe": not track_violation})
        legs.append({"action": "BUY", "option_type": "CE", "strike": c_hedge, "premium": c_hedge_prem, "lots": lots, "is_safe": True})
        legs.append({"action": "SELL", "option_type": "PE", "strike": p_short, "premium": p_short_prem, "lots": lots, "is_safe": not track_violation})
        legs.append({"action": "BUY", "option_type": "PE", "strike": p_hedge, "premium": p_hedge_prem, "lots": lots, "is_safe": True})

        net_credit_per_share = round((c_short_prem - c_hedge_prem) + (p_short_prem - p_hedge_prem), 2)
        spread_width = max(c_hedge - c_short, p_short - p_hedge)
        max_profit = round(net_credit_per_share * lot_size * lots, 2)
        max_loss = round((spread_width - net_credit_per_share) * lot_size * lots, 2)
        pop = round((1.0 - (c_target["delta"] + p_target["delta"])) * 100, 1)
        breakeven = round(c_short + net_credit_per_share, 2)
        approx_margin = round(spread_width * lot_size * lots * 1.3 + 35000, 2)
        short_strike_ce = c_short
        short_strike_pe = p_short

    roi = round((max_profit / max(1.0, approx_margin)) * 100, 2)

    # Stop-Loss levels
    sl_multiplier = 1.0 if stop_loss_rule == "1:1" else (2.0 if stop_loss_rule == "1:2" else 3.0)
    stop_loss_amount = round(max_profit * sl_multiplier, 2)

    return {
        "strategy_type": strategy_type,
        "symbol": symbol.upper(),
        "lots": lots,
        "lot_size": lot_size,
        "legs": legs,
        "net_credit_per_share": net_credit_per_share,
        "max_profit": max_profit,
        "max_loss": max_loss,
        "pop": pop,
        "roi": roi,
        "breakeven": breakeven,
        "margin_required": approx_margin,
        "stop_loss_rule": stop_loss_rule,
        "stop_loss_amount": stop_loss_amount,
        "short_strike_ce": short_strike_ce,
        "short_strike_pe": short_strike_pe,
        "track_violation": track_violation,
        "warning_note": warning_note
    }
