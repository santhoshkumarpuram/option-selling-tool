Last updated: 2026-10-25 by Antigravity — Recorded decisions on direct Yahoo API vs scrapers, eliminating mock fallbacks, and mobile layout isolation.

# 📋 Architecture Decision Records (ADR)

## DEC-001: Direct Async Yahoo Finance API over `yfinance` Library
- **Date:** 2026-10-25
- **Status:** Accepted & Implemented
- **Context:** The Raspberry Pi server is a headless Linux ARM environment. `yfinance` failed consistently with HTTP 401 Unauthorized or hung waiting for cookie crumbs, causing scan timeouts.
- **Decision:** Replace `yfinance` with an asynchronous direct HTTP client (`httpx.AsyncClient`) targeting `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=2y&interval=1d` with realistic browser headers.
- **Alternatives Rejected:**
  - *Keep `yfinance` with custom session hacks:* Fragile across releases and frequently breaks when Yahoo modifies crumb protocols.
  - *Selenium / Playwright headless browser:* Disproportionate CPU and RAM overhead on Raspberry Pi 4.
  - *Paid Market Data API (AlphaVantage / Polygon):* Added cost and potential latency for Indian equities.
- **Why:** `httpx` returns raw JSON OHLCV candles in under 200ms per ticker, requires zero external headless browser dependencies, and scans all 52 stocks in ~11.4 seconds.

---

## DEC-002: Total Elimination of Silent Fake Fallbacks
- **Date:** 2026-10-25
- **Status:** Accepted & Implemented
- **Context:** The system had synthetic fallback functions (`generate_fallback` in backend, `getDemoStocks` in frontend) that silently served hardcoded values (`58.5 / 54.2` RSI, `RELIANCE: 1285.0`) when errors occurred. This caused laptop and mobile to display contradictory, fake signals.
- **Decision:** Completely eliminate silent fake numbers. Backend returns honest `cmp: None, signal: 'No Data'` on fetch failure. Frontend displays a prominent `"⚠️ Server Offline / Demo Preview"` banner if disconnected, and `"● Live Market Data"` when live.
- **Alternatives Rejected:**
  - *Keeping fake fallbacks to prevent empty UI states:* Rejected because trading options on deceptive market signals poses catastrophic financial risk.
- **Why:** In financial trading applications, data transparency and integrity must be absolute. Users must always know if data is live or unavailable.

---

## DEC-003: Dedicated Mobile Card View via Breakpoints Without Tampering Desktop
- **Date:** 2026-10-25
- **Status:** Accepted & Implemented
- **Context:** Mobile users experienced horizontal overflow, cropped table columns, and unwieldy sidebar navigation on smartphones, but the desktop experience needed to remain 100% intact.
- **Decision:** Implement conditional Tailwind CSS breakpoint rendering (`hidden md:block` / `md:hidden`). Mobile renders a dedicated card layout and bottom tab navigation; desktop keeps the exact 9-column matrix and sticky sidebar.
- **Alternatives Rejected:**
  - *Horizontal table scroll on mobile:* Poor UX on small touchscreens; difficult to read multi-row metrics.
  - *Unifying both desktop and mobile into cards:* Degrades desktop screen real-estate efficiency where a dense 9-column matrix is preferred by traders.
- **Why:** Provides an optimal, native-feeling mobile experience on iOS/Android while preserving the trader-centric table view on desktop monitors.
