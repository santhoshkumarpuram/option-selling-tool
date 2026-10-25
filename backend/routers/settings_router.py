"""App Settings router."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from db.database import get_setting, set_setting


router = APIRouter(prefix="/api/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    delta_min: float = 0.07
    delta_max: float = 0.15
    stop_loss_rule: str = "1:2"
    paper_trading: bool = True


@router.get("")
async def get_app_settings():
    """Retrieve user trading preferences."""
    d_min = float(await get_setting("delta_min", "0.07"))
    d_max = float(await get_setting("delta_max", "0.15"))
    sl = await get_setting("stop_loss_rule", "1:2")
    paper = (await get_setting("paper_trading", "true")).lower() == "true"

    return {
        "delta_min": d_min,
        "delta_max": d_max,
        "stop_loss_rule": sl,
        "paper_trading": paper
    }


@router.put("")
async def update_app_settings(s: SettingsUpdate):
    """Update user trading preferences."""
    await set_setting("delta_min", str(s.delta_min))
    await set_setting("delta_max", str(s.delta_max))
    await set_setting("stop_loss_rule", s.stop_loss_rule)
    await set_setting("paper_trading", "true" if s.paper_trading else "false")
    return {"status": "success", "message": "Settings updated"}
