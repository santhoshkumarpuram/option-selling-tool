import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Settings,
  ShieldCheck,
  X
} from 'lucide-react'
import clsx from 'clsx'
import api from '../services/api'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Stock Scanner', shortLabel: 'Scanner' },
  { to: '/positions', icon: BarChart3, label: 'Positions Tracker', shortLabel: 'Positions' },
  { to: '/settings', icon: Settings, label: 'Broker & Settings', shortLabel: 'Settings' },
]

export default function Layout({ children }) {
  const [brokerStatus, setBrokerStatus] = useState({ connected: false, broker: null, mode: 'paper' })
  const [showMobileRules, setShowMobileRules] = useState(false)

  useEffect(() => {
    checkBroker()
    const interval = setInterval(checkBroker, 30000)
    return () => clearInterval(interval)
  }, [])

  async function checkBroker() {
    try {
      const status = await api.getBrokerStatus()
      setBrokerStatus(status)
    } catch {
      setBrokerStatus({ connected: false, broker: null, mode: 'paper' })
    }
  }

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[var(--color-bg-dark)] text-[var(--color-text-primary)]">
      {/* ======================================================== */}
      {/* MOBILE TOP BAR (Only visible on mobile screens < 768px)  */}
      {/* ======================================================== */}
      <header className="md:hidden sticky top-0 z-30 bg-[var(--color-bg-card)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between shadow-sm">
        {/* Mobile Brand */}
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[var(--color-primary)]/15 rounded-lg border border-[var(--color-primary)]/30">
            <TrendingUp className="w-5 h-5 text-[var(--color-primary)]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>OptionSell</span>
              <span className="text-[var(--color-primary)] text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30">
                PRO
              </span>
            </h1>
          </div>
        </div>

        {/* Mobile Actions: Broker Badge & DSRD Rules */}
        <div className="flex items-center gap-2">
          <NavLink
            to="/settings"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[var(--color-bg-dark)] border border-[var(--color-border)]"
          >
            <span
              className={clsx(
                'w-2 h-2 rounded-full animate-pulse',
                brokerStatus.connected ? 'bg-emerald-400' : 'bg-amber-400'
              )}
            />
            <span className="text-slate-300">
              {brokerStatus.connected ? `${brokerStatus.broker?.toUpperCase()}` : 'Paper'}
            </span>
          </NavLink>

          <button
            onClick={() => setShowMobileRules(true)}
            className="p-1.5 rounded-lg bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-[var(--color-primary)] hover:bg-[var(--color-bg-card-hover)]"
            title="DSRD Rules"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR (Untouched, only visible >= md 768px)     */}
      {/* ======================================================== */}
      <aside className="hidden md:flex w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex-col shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--color-primary)]/15 rounded-xl border border-[var(--color-primary)]/30">
              <TrendingUp className="w-6 h-6 text-[var(--color-primary)]" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[var(--color-text-primary)]">
                OptionSell <span className="text-[var(--color-primary)] text-xs font-semibold px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20">PRO</span>
              </h1>
              <p className="text-[11px] text-[var(--color-text-secondary)] font-medium">DSRD Framework (Sanjay Kathuria)</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-semibold shadow-sm border border-[var(--color-primary)]/20'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card-hover)] hover:text-[var(--color-text-primary)]'
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}

          {/* DSRD Framework Quick Reference Card */}
          <div className="mt-6 p-3 bg-[var(--color-bg-dark)]/80 rounded-xl border border-[var(--color-border)] text-xs space-y-2">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-bold text-[var(--color-primary)]">
              <span>DSRD Rules</span>
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1 text-[11px] text-[var(--color-text-secondary)]">
              <div><strong className="text-[var(--color-text-primary)]">D (Direction):</strong> Weekly + Daily RSI</div>
              <div><strong className="text-[var(--color-text-primary)]">S (Support):</strong> Put strictly below floor</div>
              <div><strong className="text-[var(--color-text-primary)]">R (Resistance):</strong> Call strictly above ceiling</div>
              <div><strong className="text-[var(--color-text-primary)]">D (Delta):</strong> 0.07 to 0.15 range (85-93% POP)</div>
            </div>
          </div>
        </nav>

        {/* Footer Broker Status */}
        <div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-card)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'w-2 h-2 rounded-full animate-pulse',
                  brokerStatus.connected ? 'bg-emerald-400' : 'bg-amber-400'
                )}
              />
              <span className="text-xs font-medium">
                {brokerStatus.connected
                  ? `${brokerStatus.broker?.toUpperCase()} (LIVE)`
                  : 'Paper Trading Mode'}
              </span>
            </div>
            <NavLink to="/settings" className="text-xs text-[var(--color-primary)] hover:underline">
              {brokerStatus.connected ? 'Manage' : 'Connect'}
            </NavLink>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN VIEWPORT                                            */}
      {/* On desktop: standard view. On mobile: extra pb for nav  */}
      {/* ======================================================== */}
      <main className="flex-1 overflow-y-auto bg-[var(--color-bg-dark)] pb-20 md:pb-0">
        {children}
      </main>

      {/* ======================================================== */}
      {/* MOBILE BOTTOM NAVIGATION (Only visible on screens < 768) */}
      {/* ======================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-bg-card)]/95 backdrop-blur-md border-t border-[var(--color-border)] pb-safe shadow-2xl">
        <div className="grid grid-cols-3 h-14">
          {navItems.map(({ to, icon: Icon, shortLabel }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-1 transition-colors select-none py-1',
                  isActive
                    ? 'text-[var(--color-primary)] font-bold'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] tracking-tight">{shortLabel}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* ======================================================== */}
      {/* MOBILE DSRD RULES MODAL (Quick reference sheet)          */}
      {/* ======================================================== */}
      {showMobileRules && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center p-0">
          <div className="w-full bg-[var(--color-bg-card)] border-t border-[var(--color-border)] rounded-t-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto pb-safe">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="font-bold text-white text-base">Sanjay Kathuria DSRD Rules</h3>
              </div>
              <button
                onClick={() => setShowMobileRules(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[var(--color-bg-dark)] rounded-xl border border-[var(--color-border)]">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <span>D — Direction (Dual RSI)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Both Weekly & Daily RSI &gt; 60 = Bullish (Sell Puts). Both &lt; 40 = Bearish (Sell Calls). Both between 40-60 = Sideways (Iron Condor). Conflicting = WAIT.
                </p>
              </div>

              <div className="p-3 bg-[var(--color-bg-dark)] rounded-xl border border-[var(--color-border)]">
                <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
                  <span>S — Support (Floor)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Put strikes MUST be placed strictly below support level S1 floor. Never sell inside the railway tracks.
                </p>
              </div>

              <div className="p-3 bg-[var(--color-bg-dark)] rounded-xl border border-[var(--color-border)]">
                <div className="font-bold text-rose-400 flex items-center gap-1.5 mb-1">
                  <span>R — Resistance (Ceiling)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Call strikes MUST be placed strictly above resistance level R1 ceiling. Staying outside tracks protects against explosive trend breakouts.
                </p>
              </div>

              <div className="p-3 bg-[var(--color-bg-dark)] rounded-xl border border-[var(--color-border)]">
                <div className="font-bold text-[var(--color-primary)] flex items-center gap-1.5 mb-1">
                  <span>D — Delta Sweet Spot (0.07 to 0.15)</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Select strikes with 0.07–0.15 Delta (85% to 93% statistical probability of expiring worthless OTM). Always hedge the position.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowMobileRules(false)}
              className="w-full py-2.5 bg-[var(--color-primary)] text-black font-bold rounded-lg text-xs"
            >
              Close Quick Guide
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
