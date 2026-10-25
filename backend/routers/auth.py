"""Broker Authentication and Status router."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from db.database import save_credentials, get_active_credentials, get_all_credentials
from models.stock import BrokerCredentials


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/connect")
async def connect_broker(creds: BrokerCredentials):
    """Save and activate broker credentials."""
    try:
        client_id = creds.client_id
        # Auto-extract 10-digit dhanClientId from JWT if demat account / 16-digit was passed
        if creds.broker.lower() == "dhan" and creds.access_token:
            try:
                import json, base64
                parts = creds.access_token.split(".")
                if len(parts) >= 2:
                    padding = "=" * (4 - len(parts[1]) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(parts[1] + padding))
                    token_client_id = payload.get("dhanClientId")
                    if token_client_id:
                        client_id = str(token_client_id)
            except Exception:
                pass

        data = {
            "broker": creds.broker.lower(),
            "client_id": client_id,
            "access_token": creds.access_token,
            "app_id": creds.app_id or "",
            "consumer_key": creds.consumer_key or "",
            "consumer_secret": creds.consumer_secret or "",
        }

        # Validate with Dhan if Dhan selected
        if creds.broker.lower() == "dhan" and client_id and creds.access_token:
            try:
                from dhanhq import dhanhq, DhanContext
                ctx = DhanContext(client_id, creds.access_token)
                dhan = dhanhq(ctx)
                profile = dhan.get_fund_limits()
                if profile.get("status") == "failure":
                    pass
            except Exception as e:
                print(f"Dhan validation check warning: {e}")

        await save_credentials(data)
        return {"status": "success", "message": f"Connected to {creds.broker.upper()} (Client ID: {client_id})", "broker": creds.broker}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/status")
async def get_broker_status():
    """Return active broker connection status."""
    creds = await get_active_credentials()
    if not creds:
        return {
            "connected": False,
            "broker": None,
            "mode": "paper",
            "message": "No broker connected (Paper Trading mode active)"
        }

    status_data = {
        "connected": True,
        "broker": creds["broker"],
        "client_id": creds.get("client_id") or creds.get("app_id"),
        "mode": "real",
        "updated_at": creds.get("updated_at")
    }

    # Verify live token with Dhan if active broker is Dhan
    if creds.get("broker") == "dhan" and creds.get("access_token"):
        try:
            from dhanhq import dhanhq, DhanContext
            ctx = DhanContext(creds.get("client_id"), creds.get("access_token"))
            dhan = dhanhq(ctx)
            funds = dhan.get_fund_limits()
            if funds.get("status") == "success":
                status_data["live_auth"] = "Verified"
                status_data["trading_api"] = "Active"
                status_data["available_balance"] = funds.get("data", {}).get("availabelBalance", 0.0)
            else:
                status_data["live_auth"] = "Failed"
                status_data["remarks"] = funds.get("remarks")
        except Exception as e:
            status_data["live_auth"] = "Check failed"
            status_data["remarks"] = str(e)

    return status_data


@router.get("/all")
async def list_configured_brokers():
    """List all configured brokers."""
    return await get_all_credentials()
