Last updated: 2026-10-25 by Antigravity — Moved completed mobile UI and async scanner tasks to Done section; added real-time WebSocket & alert tasks.

# 📋 Option Selling Tool — Project Roadmap & TODO List

---

## 👥 Multi-User Support & Tenant Isolation

Planned architecture to support multiple concurrent users (e.g. 5+ traders), each having their own dashboard, broker connections, trading settings, and portfolio.

### 1. Authentication & Security Layer
- [ ] **User Model & Table:** Create `users` table (`id`, `email`, `password_hash`, `full_name`, `created_at`, `is_active`).
- [ ] **Password Security:** Secure password hashing using `bcrypt` / `passlib` with proper salt rounds.
- [ ] **JWT Token Handling:** Issue JSON Web Tokens (access + refresh tokens) for authenticated sessions via FastAPI.
- [ ] **FastAPI Auth Middleware:** Protect all private endpoints with `Depends(get_current_user)`.
- [ ] **Credential Encryption at Rest:** Encrypt sensitive broker keys (`access_token`, `consumer_secret`, etc.) in the database using `cryptography.fernet` with a server secret key.

### 2. Multi-Tenant Database Scoping
- [ ] **User Broker Credentials:** Update `credentials` table to `user_credentials` with composite unique constraint `(user_id, broker)` so each user can configure their own Dhan, FYERS, Kotak Neo, or Paper trading mode.
- [ ] **User Positions & Trades:** Add `user_id REFERENCES users(id)` to the `positions` table so open/closed paper and live positions belong strictly to the authenticated user.
- [ ] **User Settings:** Scope user preferences (Stop-loss multipliers 1:1, 1:2, 1:3, default lot sizes, notification preferences) to `user_id`.
- [ ] **Database Concurrency:** Enable SQLite WAL (Write-Ahead Logging) mode or prepare migration scripts for PostgreSQL to handle concurrent writes from multiple active sessions without database locking.

### 3. Shared Market Data & Scanner Optimization
- [ ] **Centralized Background Scanner:** Decouple market data scanning from individual user requests into a standing periodic job.
- [ ] **Broker API Rate Limit Guard:** Ensure multiple users requesting option chains do not exceed broker API rate limits.

### 4. Frontend Multi-User UI
- [ ] **Auth Pages:** Create Login and Registration views in React.
- [ ] **Session State & Interceptors:** Persist JWT tokens in secure client state and inject `Authorization: Bearer <token>` in all Axios API requests.
- [ ] **User Profile & Navigation Header:** Display logged-in user profile, avatar, and active broker status tag (e.g. `User: trader1 | Dhan Connected`).
- [ ] **Isolated Views:** Ensure Dashboard, Positions, Trade Journal, and Settings load data exclusively for the active session.

---

## 📈 Other Planned Enhancements

- [ ] **Automated Stop-Loss Trailing:** Background task to trigger auto-exit when short strike or 1:2 net credit loss threshold is breached.
- [ ] **Telegram / WhatsApp Alerts:** Instant notification when DSRD smoke detectors score 2/3 or 3/3 on active positions.
- [ ] **Trade Journal Export:** CSV / Excel export of closed positions for tax and performance auditing.
- [ ] **WebSocket Live Price Feeds:** Real-time spot price tick updates during active market hours (09:15–15:30 IST) to replace manual polling.

---

## ✅ Completed / Done

- [x] **Mobile Responsive UI:** Built dedicated smartphone card layout, bottom sticky navigation, swipeable sentiment filter bar, and safe-area padding while preserving desktop 9-column matrix and sidebar.
- [x] **Asynchronous Multithreaded Scanner:** Rebuilt scanner with `asyncio.gather` bounded by `asyncio.Semaphore(12)`, cutting scan duration from >60s to ~11s.
- [x] **Direct Market Data Integration:** Eliminated flaky `yfinance` scraper and implemented direct `httpx.AsyncClient` Yahoo Finance v8 chart API with browser headers.
- [x] **In-Memory Caching:** Implemented 300s TTL cache in `backend/services/ta_engine.py` for sub-millisecond cached scanner responses.
- [x] **Elimination of Silent Mock Data:** Removed synthetic `generate_fallback` data from backend to ensure data honesty and user trust.
- [x] **Transparent Live Status & Timestamp UI:** Added `"● Live Market Data"` badge, offline warning banner, and `"Last refreshed: HH:MM:SS"` display on the dashboard.
- [x] **Tata Motors Demerger Ticker Fix:** Updated symbol resolution from deprecated `TATAMOTORS.NS` to active `TMPV.NS`.
