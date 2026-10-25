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
- [ ] **Centralized Background Scanner:** Decouple market data scanning from individual user requests.
- [ ] **In-Memory Caching:** Calculate DSRD universe scans (RSI, S/R pivots, divergence, smoke detectors) once every 1–3 minutes in a background worker and serve cached results instantly to all users with minimal CPU & memory usage.
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
