Last updated: 2026-10-25 by Antigravity — Recorded resolved issues for Raspberry Pi headless data fetch, timeout, and ticker mappings, plus active monitoring notes.

# 🐛 Known Issues & Resolution Log

## ✅ Resolved Issues

### 1. `yfinance` 401 Unauthorized / Crumb Blocking on Raspberry Pi
- **Status:** FIXED
- **Root Cause:** Yahoo Finance blocks automated Python requests/scrapers coming from headless Linux environments without interactive cookie sessions. `yfinance` threw 401 Unauthorized or hung indefinitely on Raspberry Pi ARM.
- **Resolution:** Replaced `yfinance` with direct calls via `httpx.AsyncClient` with realistic modern browser `User-Agent` headers targeting `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}`.

### 2. Discrepancy & Fake Fallback Data Between Mobile and Laptop
- **Status:** FIXED
- **Root Cause:** When `yfinance` failed on the backend, it silently caught the exception and generated hardcoded fake data (`Weekly RSI 58.5, Daily RSI 54.2` for all 52 stocks). When laptop timed out, it caught Axios error and loaded client demo data.
- **Resolution:** Completely removed synthetic fake values from `ta_engine.py`. Added explicit `isDemo` UI states and live indicator badges (`● Live Market Data`) and `"Last refreshed:"` timestamps.

### 3. Axios 45s Timeout on Dashboard Initial Load
- **Status:** FIXED
- **Root Cause:** The scanner was previously making 52 synchronous sequential requests, which easily exceeded the 45-second Axios client timeout.
- **Resolution:** Implemented asynchronous concurrent batching with `asyncio.Semaphore(12)` in `backend/routers/scanner.py`, reducing total scan time to ~11.4 seconds. Increased Axios timeout to 60s in `frontend/src/services/api.js`.

### 4. TATAMOTORS.NS 404 Not Found on Yahoo Finance
- **Status:** FIXED
- **Root Cause:** Following the corporate demerger of Tata Motors, the legacy ticker `TATAMOTORS.NS` was delisted/renamed on Yahoo Finance.
- **Resolution:** Updated ticker mapping in `backend/services/ta_engine.py` to route `TATAMOTORS` to `TMPV.NS` (Tata Motors Passenger Vehicles Ltd).

---

## ⚠️ Active Considerations & Monitoring Notes

### 1. Public API Rate Limiting on Yahoo Finance
- **Impact:** Very low under normal usage; potential risk if a user repeatedly mashes "Refresh Scan" continuously.
- **Mitigation:** Backend enforces a 300-second (5-minute) TTL cache in `_TA_CACHE`. Rapid re-requests return cached data in <1ms without hitting Yahoo Finance servers.

### 2. Market Close Timestamps
- **Impact:** Informational.
- **Behavior:** During weekends and outside Indian market hours (09:15–15:30 IST), the chart API returns data as of the last market close. Live refresh will indicate the time the scan was executed, but prices remain fixed at Friday's closing quotes until market open.
