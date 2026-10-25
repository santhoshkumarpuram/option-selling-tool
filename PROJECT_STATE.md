Last updated: 2026-10-25 by Antigravity — Added mobile responsive UI, migrated scanner to direct async Yahoo Finance API with live/demo badges, and eliminated fake data fallbacks.

# 📌 Project State: Option Selling Tool (DSRD Framework)

## 🟢 Current Status
The project is **fully operational** and deployed on a local Raspberry Pi 4 server (`192.168.29.99:8000`) with production-ready frontend and backend services.

### Key Capabilities Verified:
1. **DSRD Market Scanner:**
   - Scans 52 instruments (Nifty 50 constituents + Nifty & Bank Nifty indices) in parallel.
   - Dual-timeframe Wilder's RSI calculation (Daily RSI + Weekly RSI resampled from Friday closes).
   - Dynamic Support & Resistance detection with multi-touch swing clustering.
   - Strike Railway Track alignment check (Delta 0.07 – 0.15 outside S/R tracks).
   - Concurrency: Executes in **~11.4 seconds** via `httpx.AsyncClient` + `asyncio.Semaphore(12)`.
   - Caching: 300-second in-memory cache delivers instant subsequent requests.

2. **Responsive Multi-Device UI:**
   - **Desktop:** Full 9-column DSRD matrix table with persistent sticky sidebar navigation.
   - **Mobile:** Dedicated responsive card layout, sticky bottom navigation bar, collapsible filter drawer, and quick-sheet modals. Fully touch-optimized with no horizontal scrolling bugs.
   - **Live Transparency:** Clear `"● Live Market Data"` badge and `"Last refreshed: HH:MM:SS"` timestamp next to the Refresh button. If server connection drops, an explicit `"⚠️ Server Offline / Demo Preview"` banner alerts the user.

3. **Data Integrity & Honesty:**
   - All silent hardcoded fallbacks (`58.5 / 54.2` RSI) have been eradicated from the technical analysis engine.
   - Real market data from Yahoo Finance v8 chart API is used exclusively.

4. **Broker & Paper Trading:**
   - DhanHQ v2 integration ready for live execution and option chain streaming.
   - Built-in Paper Trading mode calculates Black-Scholes Greeks, margin requirements, probability of profit (POP), and risk-reward metrics without requiring live API keys.

---

## 🏗️ Environment & Deployment
- **Server:** Raspberry Pi 4 (Raspberry Pi OS / Linux ARM).
- **Service:** `optionsell.service` (systemd managing FastAPI uvicorn daemon on port 8000).
- **Frontend Build:** Built using Vite (`frontend/dist`) and statically served by FastAPI.
- **Source Control:** Synchronized on `origin/main` (`github.com/santhoshkumarpuram/option-selling-tool`).
