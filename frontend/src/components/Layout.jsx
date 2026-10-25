import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, BarChart3, Settings, ShieldCheck, Zap } from 'lucide-react'
import clsx from 'clsx'
import api from '../services/api'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Stock Scanner' },
  { to: '/positions', icon: BarChart3, label: 'Positions Tracker' },
  { to: '/settings', icon: Settings, label: 'Broker & Settings' },
]

export default function Layout({ children }) {
  const [brokerStatus, setBrokerStatus] = useState({ connected: false, broker: null, mode: 'paper' })
  const location = useLocation()

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
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg-dark)] text-[var(--color-text-primary)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--color-bg-card)] border-r border-[var(--color-border)] flex flex-col shrink-0">
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

      {/* Main viewport */}
      <main className="flex-1 overflow-auto bg-[var(--color-bg-dark)]">
        {children}
      </main>
    </div>
  )
}
