# 📈 Option Selling Tool (DSRD Framework)

A systematic web platform for **Options Selling** on Indian equities (Nifty 50) and Indices (Nifty 50, Bank Nifty), built on **CFA Sanjay Kathuria's DSRD Framework**.

---

## 🧠 The DSRD Core Strategy

The application automates the **DSRD Checklist** before every trade:

| Step | Rule | Target | Action |
|------|------|--------|--------|
| **D — Direction** | Weekly & Daily RSI | Both > 60 | **Hedge Put** (Bull Put Spread) |
| | | Both < 40 | **Hedge Call** (Bear Call Spread) |
| | | Both 40–60 | **Iron Condor** (Range-bound) |
| | | Disagree / Conflicting | **WAIT** (We do not trade confusion) |
| **S — Support** | Multi-timeframe S/R analysis | Floor levels (touches ≥ 2) | Short Put must be **strictly below** Support |
| **R — Resistance** | Multi-timeframe S/R analysis | Ceiling levels (touches ≥ 2) | Short Call must be **strictly above** Resistance |
| **D — Delta** | Option Greeks Sweet Spot | Delta **0.07 – 0.15** | Win probability of **85% – 93%** |

### ⚠️ The Railway Tracks Rule
> *"Never stand in between the railway tracks."*
Always sell strikes outside the support/resistance channel. Selling inside the tracks for extra premium invites catastrophic tail risk.

### 🔥 Smoke Detector (3-Point Early Reversal Warning)
1. **Bollinger Squeeze:** Bandwidth narrowing signals explosive volatility expansion; band breach warns against short positions on that side.
2. **RSI Divergence:** Price higher-high + RSI lower-high (bearish exhaustion) or price lower-low + RSI higher-low (bullish exhaustion).
3. **Candlestick Patterns:** Engulfing, Morning/Evening Stars, Shooting Stars, Hammers.
- **Score 0/3:** Safe to proceed.
- **Score 1/3:** Minor warning.
- **Score 2–3/3:** High danger of reversal; do not enter new positions, tighten stops on existing ones.

### 🛑 Stop-Loss Framework
- **1:1 Stop Rule:** Max loss = 1× Net Credit (Conservative)
- **1:2 Stop Rule:** Max loss = 2× Net Credit (Standard)
- **1:3 Stop Rule:** Max loss = 3× Net Credit (Aggressive)
- **Strike Breach:** Exit immediately if the underlying spot breaches the short strike.

---

## 🚀 Quick Start

### 1. Start Both Backend & Frontend in One Click
Double-click `start-app.bat` in the root folder, or run:

```bash
# Terminal 1 - Backend (FastAPI on Port 8000)
cd backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2 - Frontend (Vite on Port 5173)
cd frontend
npm run dev
```

Open your browser at:
- **Web UI:** [http://localhost:5173](http://localhost:5173)
- **API Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🔑 Broker API Integration

### Dhan (DhanHQ v2)
1. Go to your [Dhan Web Developer Dashboard](https://dhanhq.co/).
2. Copy your **Client ID** and generate an **Access Token** (JWT).
3. In the Option Selling Tool, navigate to **Broker & Settings**.
4. Select **Dhan**, enter your credentials, and click **Connect**.
5. Once connected, live Option Chains with Delta, Theta, IV, and direct order placement are active!

### FYERS & Kotak Neo
The tool features a modular broker abstraction layer with direct field inputs for FYERS App ID / Token and Kotak Neo Consumer Key / Secret / Token.

### Paper Trading Mode
The tool runs fully in **Paper Trading Mode** out of the box without requiring real broker credentials. All Greeks and payoffs are computed using a high-precision Black-Scholes analytical engine.

---

## 📁 Project Architecture

```
Option Selling Tool/
├── backend/
│   ├── main.py                     # FastAPI server
│   ├── config.py                   # Nifty 50 stocks, thresholds, settings
│   ├── routers/
│   │   ├── auth.py                 # Broker login & session status
│   │   ├── scanner.py              # DSRD universe scanner
│   │   ├── analysis.py             # DSRD checklist engine
│   │   ├── options.py              # Option chain, Greeks & strategy payoff
│   │   ├── positions.py            # Active/closed portfolio tracker
│   │   └── settings_router.py      # User trading preferences
│   ├── services/
│   │   ├── ta_engine.py            # Wilder's RSI (W+D), S/R detection
│   │   ├── smoke_detector.py       # Bollinger Squeeze, RSI Div, Candlestick
│   │   ├── broker_service.py       # DhanHQ API & Black-Scholes engine
│   │   └── strategy_builder.py     # Spreads, POP, ROI, Margin & SL calc
│   ├── models/                     # Pydantic schemas
│   └── db/                         # SQLite async database
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Real-time stock scanner & market stats
│   │   │   ├── Analysis.jsx        # 4-step DSRD checklist & trade builder
│   │   │   ├── Positions.jsx       # Portfolio tracking & smoke alerts
│   │   │   └── Settings.jsx        # Broker credentials & risk limits
│   │   ├── components/             # Reusable widgets
│   │   └── services/               # Backend API client
│   └── vite.config.js
├── start-app.bat                   # 1-click launcher
├── start-backend.bat               # Backend launcher
├── start-frontend.bat              # Frontend launcher
├── TODO.md                         # Roadmap & multi-user feature backlog
└── README.md
```

---

## 🗺️ Roadmap & Planned Features

Check [TODO.md](file:///Z:/Option%20Selling%20Tool/TODO.md) for the active development roadmap, including **Multi-User Support**, per-user dashboards, broker credential encryption, and shared scanner caching.

