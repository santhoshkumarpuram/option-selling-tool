Last updated: 2026-10-25 by Antigravity — Documented async market data fetcher architecture and dual-mode responsive layout.

# 🏛️ Architecture & System Design

## 1. System Overview
The Option Selling Tool is an end-to-end systematic trading web application that automates CFA Sanjay Kathuria's **DSRD Framework** (Direction, Support, Resistance, Delta) for Indian equities and indices.

```
┌────────────────────────────────────────────────────────┐
│             Frontend (React 18 + Tailwind CSS)         │
│  - Desktop: 9-col DSRD Table, Persistent Sidebar       │
│  - Mobile: Touch Card View, Fixed Bottom Nav, Sheets   │
└───────────────────────────▲────────────────────────────┘
                            │ REST / JSON (Axios, 60s timeout)
┌───────────────────────────▼────────────────────────────┐
│              FastAPI Backend (Port 8000)                │
│  - /api/scanner    : Async Parallel Scan + Cache       │
│  - /api/analysis   : DSRD Checklist + Smoke Detector   │
│  - /api/options    : Chains, Payoffs, Black-Scholes    │
│  - /api/positions  : Portfolio Tracking & Alerts       │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
   Direct Async HTTP (httpx)      DhanHQ v2 API / SQLite
              │                            │
┌─────────────▼──────────────┐ ┌───────────▼─────────────┐
│  Yahoo Finance v8 Chart API │ │ Broker / Database Layer │
│  (Real-time OHLCV + Weekly)│ │ (Credentials & Positions)│
└────────────────────────────┘ └─────────────────────────┘
```

---

## 2. Market Data Architecture *(Updated)*

### Direct Async HTTP Fetcher (`backend/services/ta_engine.py`)
- **Direct API Call:** Directly queries Yahoo Finance's v8 chart endpoint:
  `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=2y&interval=1d`
- **Browser User-Agent Header:** Mimics standard modern browser headers to bypass Yahoo Finance headless Linux bot blockers that broke `yfinance`.
- **Zero-Network Weekly Resampling:** Derives weekly candles locally by resampling daily closing prices (`df['Close'].resample('W-FRI').last().dropna()`), avoiding extra HTTP calls for weekly timeframe.
- **Multithreaded Batch Worker:** `backend/routers/scanner.py` runs scans using `asyncio.gather` bounded by `asyncio.Semaphore(12)`.
- **In-Memory Cache:** `_TA_CACHE` retains computed technical indicators for 300 seconds (5 minutes) with timestamp invalidation.

---

## 3. Frontend Responsive Architecture *(Updated)*

### Dual Layout Strategy
- **Breakpoint Separation:** Strict Tailwind CSS breakpoint demarcation (`md:hidden` vs `hidden md:block` / `md:flex`).
- **Desktop UI:** Intact 9-column DSRD matrix table with sortable columns, smoke detector badges, and sticky sidebar navigation.
- **Mobile UI:**
  - Fixed mobile top header with title and live status.
  - Floating sticky bottom tab bar (`Dashboard`, `Positions`, `Settings`).
  - Mobile stock cards displaying Direction status, CMP, Dual RSI tags, and Railway Track safety pill.
  - Horizontal scrollable filter pills for quick one-thumb filtering by sentiment.
- **Data Transparency Layer:**
  - Client maintains `isDemo` flag.
  - Sourced live: Shows `"● Live Market Data"` badge and `"Last refreshed: HH:MM:SS"`.
  - Sourced offline: Displays `"⚠️ Server Offline / Demo Preview"` banner with actionable retry button.
