import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  Search,
  RefreshCw,
  Flame,
  Shield,
  ShieldCheck,
  AlertTriangle,
  Layers,
  ChevronRight
} from 'lucide-react'
import clsx from 'clsx'
import api from '../services/api'

const signalStyles = {
  'Strong Bullish': {
    badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    icon: ArrowUpRight,
    label: 'Strong Bullish'
  },
  'Bullish Pullback': {
    badge: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
    icon: ArrowUpRight,
    label: 'Bullish Pullback'
  },
  'Strong Bearish': {
    badge: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    icon: ArrowDownRight,
    label: 'Strong Bearish'
  },
  'Bearish Bounce': {
    badge: 'bg-orange-500/15 text-orange-300 border border-orange-500/30',
    icon: ArrowDownRight,
    label: 'Bearish Bounce'
  },
  'Sideways': {
    badge: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
    icon: Minus,
    label: 'Sideways'
  },
  'Wait': {
    badge: 'bg-slate-700/40 text-slate-400 border border-slate-600/30',
    icon: Clock,
    label: 'Wait (Conflicting)'
  },
}

const strategyConfig = {
  hedge_put: { label: 'Hedge Put (Bull Put)', color: 'text-emerald-400 bg-emerald-500/10' },
  hedge_call: { label: 'Hedge Call (Bear Call)', color: 'text-rose-400 bg-rose-500/10' },
  iron_condor: { label: 'Iron Condor (Both Sides)', color: 'text-indigo-400 bg-indigo-500/10' },
  wait: { label: 'No Trade (Wait)', color: 'text-slate-400 bg-slate-800/40' },
}

export default function Dashboard() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState(() => {
    try {
      return localStorage.getItem('dsrd_last_refreshed') || null
    } catch {
      return null
    }
  })
  const [search, setSearch] = useState('')
  const [signalFilter, setSignalFilter] = useState('ALL')
  const [sectorFilter, setSectorFilter] = useState('ALL')
  const [sweetspotOnly, setSweetspotOnly] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  function markRefreshed() {
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
    setLastRefreshed(timeStr)
    try {
      localStorage.setItem('dsrd_last_refreshed', timeStr)
    } catch {
      // ignore
    }
  }

  async function loadData() {
    setLoading(true)
    try {
      const data = await api.getScanner()
      setStocks(data)
      setIsDemo(false)
      markRefreshed()
    } catch (err) {
      console.error('Failed to load scanner data:', err)
      setStocks(getDemoStocks())
      setIsDemo(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      const data = await api.refreshScanner()
      setStocks(data)
      setIsDemo(false)
      markRefreshed()
    } catch {
      await loadData()
    } finally {
      setRefreshing(false)
    }
  }

  // Get unique sectors
  const sectors = ['ALL', ...new Set(stocks.map(s => s.sector).filter(Boolean))]

  const filteredStocks = stocks.filter(s => {
    const matchSearch =
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(search.toLowerCase()))
    
    const matchSignal =
      signalFilter === 'ALL'
        ? true
        : signalFilter === 'BULLISH'
        ? s.signal.includes('Bullish')
        : signalFilter === 'BEARISH'
        ? s.signal.includes('Bearish')
        : signalFilter === 'SIDEWAYS'
        ? s.signal === 'Sideways'
        : s.signal === 'Wait'

    const matchSector = sectorFilter === 'ALL' || s.sector === sectorFilter
    const matchSweetspot = !sweetspotOnly || s.track_safe === true
    return matchSearch && matchSignal && matchSector && matchSweetspot
  })

  // Summary counts
  const bullishCount = stocks.filter(s => s.signal.includes('Bullish')).length
  const bearishCount = stocks.filter(s => s.signal.includes('Bearish')).length
  const sidewaysCount = stocks.filter(s => s.signal === 'Sideways').length
  const waitCount = stocks.filter(s => s.signal === 'Wait').length

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Nifty 50 DSRD Scanner
          </h1>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-0.5 sm:mt-1">
            Systematic high-probability option selling rules: Direction (RSI) → Support & Resistance → Delta (0.07-0.15)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 self-start sm:self-auto">
          {/* Live vs Demo Badge */}
          {isDemo ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-2 rounded-lg border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-semibold">Demo Data</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-2 rounded-lg border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold">Live Market Data</span>
            </div>
          )}

          {lastRefreshed && (
            <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-[var(--color-bg-card)] px-3 py-2 rounded-lg border border-[var(--color-border)] shadow-sm">
              <Clock className="w-3.5 h-3.5 text-[var(--color-primary)] shrink-0" />
              <span>Last refreshed: <strong className="text-white font-mono font-bold">{lastRefreshed}</strong></span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] hover:bg-[var(--color-bg-card-hover)] text-xs sm:text-sm font-medium rounded-lg text-white transition-colors"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5 sm:w-4 sm:h-4', refreshing && 'animate-spin')} />
            <span>{refreshing ? 'Scanning...' : 'Refresh Scan'}</span>
          </button>
        </div>
      </div>

      {/* Warning Banner when backend is unreachable */}
      {isDemo && (
        <div className="flex items-start sm:items-center gap-3 p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
          <div className="flex-1">
            <span className="font-bold text-amber-200">Server Offline / Demo Preview:</span>
            {' '}Could not connect to Raspberry Pi live backend. Showing sample offline data. Click <strong>Refresh Scan</strong> to retry or ensure the backend service is running.
          </div>
        </div>
      )}

      {/* Market Sentiment Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <StatCard
          label="Strong / Pullback Bullish"
          count={bullishCount}
          subtitle="Strategy: Hedge Put (Bull Put Spread)"
          color="border-emerald-500/30 bg-emerald-500/5 text-emerald-400"
          onClick={() => setSignalFilter('BULLISH')}
          active={signalFilter === 'BULLISH'}
        />
        <StatCard
          label="Strong / Bounce Bearish"
          count={bearishCount}
          subtitle="Strategy: Hedge Call (Bear Call Spread)"
          color="border-rose-500/30 bg-rose-500/5 text-rose-400"
          onClick={() => setSignalFilter('BEARISH')}
          active={signalFilter === 'BEARISH'}
        />
        <StatCard
          label="Sideways Neutral (40-60)"
          count={sidewaysCount}
          subtitle="Strategy: Iron Condor (Both sides)"
          color="border-indigo-500/30 bg-indigo-500/5 text-indigo-400"
          onClick={() => setSignalFilter('SIDEWAYS')}
          active={signalFilter === 'SIDEWAYS'}
        />
        <StatCard
          label="Conflicting / Wait"
          count={waitCount}
          subtitle="Rule: We don't trade confusion"
          color="border-slate-600/30 bg-slate-800/20 text-slate-400"
          onClick={() => setSignalFilter('WAIT')}
          active={signalFilter === 'WAIT'}
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-2.5 sm:gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            placeholder="Search stock by symbol or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto">
          {/* Signal Filter Chips (Horizontal swipeable on mobile) */}
          <div className="flex bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg p-1 text-xs overflow-x-auto no-scrollbar">
            {['ALL', 'BULLISH', 'BEARISH', 'SIDEWAYS', 'WAIT'].map(f => (
              <button
                key={f}
                onClick={() => setSignalFilter(f)}
                className={clsx(
                  'px-3 py-1 rounded font-medium transition-colors shrink-0',
                  signalFilter === f
                    ? 'bg-[var(--color-primary)] text-black font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:text-white'
                )}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Sector select */}
            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              className="flex-1 sm:flex-none bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[var(--color-primary)]"
            >
              {sectors.map(s => (
                <option key={s} value={s}>{s === 'ALL' ? 'All Sectors' : s}</option>
              ))}
            </select>

            {/* Sweetspot Aligned Toggle */}
            <button
              onClick={() => setSweetspotOnly(prev => !prev)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all shrink-0',
                sweetspotOnly
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-[var(--color-bg-card)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:text-white'
              )}
            >
              <ShieldCheck className={clsx("w-3.5 h-3.5", sweetspotOnly ? "text-emerald-400" : "text-slate-400")} />
              <span className="hidden sm:inline">Sweetspot Aligned Only (0.07–0.15Δ)</span>
              <span className="sm:hidden">Safe 0.07–0.15Δ</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* DESKTOP STOCK TABLE (Untouched, hidden on mobile < 768px)*/}
      {/* ======================================================== */}
      <div className="hidden md:block bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--color-bg-dark)]/60 text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-[var(--color-border)]">
              <tr>
                <th className="py-3 px-4">Script</th>
                <th className="py-3 px-4 text-right">CMP (₹)</th>
                <th className="py-3 px-4 text-center">Weekly RSI</th>
                <th className="py-3 px-4 text-center">Daily RSI</th>
                <th className="py-3 px-4 text-center">DSRD Signal</th>
                <th className="py-3 px-4 text-center">Recommended Strategy</th>
                <th className="py-3 px-4 text-center">Track Alignment (0.07–0.15Δ)</th>
                <th className="py-3 px-4 text-center">Smoke Warn</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-[var(--color-text-secondary)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-primary)]" />
                      <span>Scanning technical indicators across Nifty 50 universe...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStocks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[var(--color-text-secondary)]">
                    No stocks match your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStocks.map(stock => {
                  const style = signalStyles[stock.signal] || signalStyles['Wait']
                  const SigIcon = style.icon
                  const strat = strategyConfig[stock.strategy] || strategyConfig['wait']

                  return (
                    <tr
                      key={stock.symbol}
                      className="hover:bg-[var(--color-bg-card-hover)] transition-colors group"
                    >
                      {/* Symbol & Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white group-hover:text-[var(--color-primary)] transition-colors">
                          {stock.symbol}
                        </div>
                        <div className="text-xs text-[var(--color-text-secondary)]">
                          {stock.name || stock.symbol} · <span className="text-slate-400">{stock.sector}</span>
                        </div>
                      </td>

                      {/* CMP */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                        ₹{stock.cmp?.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                      </td>

                      {/* Weekly RSI */}
                      <td className="py-3.5 px-4 text-center">
                        <RSIBadge value={stock.weekly_rsi} />
                      </td>

                      {/* Daily RSI */}
                      <td className="py-3.5 px-4 text-center">
                        <RSIBadge value={stock.daily_rsi} />
                      </td>

                      {/* Signal */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', style.badge)}>
                          <SigIcon className="w-3.5 h-3.5" />
                          <span>{stock.signal}</span>
                        </span>
                      </td>

                      {/* Strategy */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={clsx('px-2.5 py-1 rounded-md text-xs font-semibold', strat.color)}>
                          {strat.label}
                        </span>
                      </td>

                      {/* Track Alignment */}
                      <td className="py-3.5 px-4 text-center">
                        <TrackAlignmentPill status={stock.track_status} safe={stock.track_safe} />
                      </td>

                      {/* Smoke Warning */}
                      <td className="py-3.5 px-4 text-center">
                        <SmokePill score={stock.smoke_score || 0} />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/analysis/${stock.symbol}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[var(--color-primary)] text-black rounded-lg text-xs font-semibold hover:bg-[var(--color-primary-dark)] transition-colors shadow-sm"
                        >
                          <span>Analyze</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MOBILE STOCK CARDS VIEW (Only visible on screens < 768px)*/}
      {/* ======================================================== */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-12 text-center text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
            <RefreshCw className="w-7 h-7 animate-spin text-[var(--color-primary)] mx-auto mb-2" />
            <p className="text-sm font-medium text-white">Scanning Nifty 50 Universe...</p>
            <p className="text-xs text-slate-400 mt-1">Calculating RSIs, Support/Resistance & Delta sweet spots</p>
          </div>
        ) : filteredStocks.length === 0 ? (
          <div className="py-12 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
            No stocks match your filter criteria.
          </div>
        ) : (
          filteredStocks.map(stock => {
            const style = signalStyles[stock.signal] || signalStyles['Wait']
            const SigIcon = style.icon
            const strat = strategyConfig[stock.strategy] || strategyConfig['wait']

            return (
              <div
                key={stock.symbol}
                className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-3.5 space-y-3 shadow-md"
              >
                {/* Header: Symbol & Sector on left, CMP on right */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white tracking-tight">{stock.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium border border-slate-700">
                        {stock.sector}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                      {stock.name || stock.symbol}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">CMP</div>
                    <div className="text-base font-mono font-black text-white">
                      ₹{stock.cmp?.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                {/* Signal & Strategy Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', style.badge)}>
                    <SigIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{stock.signal}</span>
                  </span>
                  <span className={clsx('px-2.5 py-1 rounded-md text-xs font-semibold', strat.color)}>
                    {strat.label}
                  </span>
                </div>

                {/* Technical Indicators: Weekly/Daily RSI & Track/Smoke */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-[var(--color-bg-dark)]/90 rounded-lg border border-[var(--color-border)]">
                    <div className="text-[10px] text-slate-400 font-medium">Weekly RSI</div>
                    <div className="mt-1 flex items-center justify-between">
                      <RSIBadge value={stock.weekly_rsi} />
                      <span className="text-[10px] text-slate-500">{stock.weekly_rsi >= 60 ? 'Trend ↗' : stock.weekly_rsi <= 40 ? 'Trend ↘' : 'Range'}</span>
                    </div>
                  </div>

                  <div className="p-2 bg-[var(--color-bg-dark)]/90 rounded-lg border border-[var(--color-border)]">
                    <div className="text-[10px] text-slate-400 font-medium">Daily RSI</div>
                    <div className="mt-1 flex items-center justify-between">
                      <RSIBadge value={stock.daily_rsi} />
                      <span className="text-[10px] text-slate-500">{stock.daily_rsi >= 60 ? 'Bullish' : stock.daily_rsi <= 40 ? 'Bearish' : 'Neutral'}</span>
                    </div>
                  </div>

                  <div className="p-2 bg-[var(--color-bg-dark)]/90 rounded-lg border border-[var(--color-border)] col-span-2 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium mb-0.5">Railway Track (0.07-0.15Δ)</div>
                      <TrackAlignmentPill status={stock.track_status} safe={stock.track_safe} />
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 font-medium mb-0.5">Smoke Risk</div>
                      <SmokePill score={stock.smoke_score || 0} />
                    </div>
                  </div>
                </div>

                {/* Analyze Full Button */}
                <Link
                  to={`/analysis/${stock.symbol}`}
                  className="w-full py-2.5 px-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow"
                >
                  <span>Analyze Setup & Build Trade</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function StatCard({ label, count, subtitle, color, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'text-left p-3 sm:p-4 rounded-xl border transition-all duration-150',
        color,
        active ? 'ring-2 ring-[var(--color-primary)]' : 'hover:border-opacity-60'
      )}
    >
      <div className="text-[10px] sm:text-xs font-medium uppercase tracking-wider opacity-80 leading-tight">{label}</div>
      <div className="text-xl sm:text-2xl font-bold mt-1 mb-0.5">{count}</div>
      <div className="text-[10px] sm:text-[11px] opacity-70 truncate">{subtitle}</div>
    </button>
  )
}

function RSIBadge({ value }) {
  if (value == null) return <span className="text-xs text-slate-500">—</span>
  const isBull = value >= 60.0
  const isBear = value <= 40.0

  return (
    <span
      className={clsx(
        'inline-block px-2 py-0.5 rounded text-xs font-mono font-bold',
        isBull
          ? 'bg-emerald-500/20 text-emerald-300'
          : isBear
          ? 'bg-rose-500/20 text-rose-300'
          : 'bg-indigo-500/20 text-indigo-300'
      )}
    >
      {value.toFixed(1)}
    </span>
  )
}

function SmokePill({ score }) {
  if (score === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        0/3 OK
      </span>
    )
  }
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full',
        score >= 2 ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-300'
      )}
    >
      <Flame className="w-3 h-3" />
      {score}/3
    </span>
  )
}

function TrackAlignmentPill({ status, safe }) {
  if (!status || status === '—' || status.startsWith('Wait')) {
    return <span className="text-xs text-slate-500">—</span>
  }

  if (safe) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>{status}</span>
      </span>
    )
  }

  if (status === 'Inside Track') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
        <span>Inside Track ⚠️</span>
      </span>
    )
  }

  if (status.includes('Partial')) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
        <span>{status}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 whitespace-nowrap">
      {status}
    </span>
  )
}

function getDemoStocks() {
  return [
    { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Oil & Gas', cmp: 1285.5, weekly_rsi: 38.2, daily_rsi: 44.1, signal: 'Bearish Bounce', strategy: 'hedge_call', track_status: 'Safe (Outside R1)', track_safe: true, smoke_score: 0 },
    { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', cmp: 3845.0, weekly_rsi: 63.5, daily_rsi: 65.8, signal: 'Strong Bullish', strategy: 'hedge_put', track_status: 'Safe (Outside S1)', track_safe: true, smoke_score: 0 },
    { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Banking', cmp: 1785.3, weekly_rsi: 54.1, daily_rsi: 52.8, signal: 'Sideways', strategy: 'iron_condor', track_status: 'Inside Track', track_safe: false, smoke_score: 1 },
    { symbol: 'INFY', name: 'Infosys', sector: 'IT', cmp: 1567.2, weekly_rsi: 68.8, daily_rsi: 71.2, signal: 'Strong Bullish', strategy: 'hedge_put', track_status: 'Safe (Outside S1)', track_safe: true, smoke_score: 0 },
    { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Banking', cmp: 1342.6, weekly_rsi: 46.3, daily_rsi: 48.7, signal: 'Sideways', strategy: 'iron_condor', track_status: 'Safe (Both Outside)', track_safe: true, smoke_score: 0 },
    { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', cmp: 958.6, weekly_rsi: 41.0, daily_rsi: 43.5, signal: 'Sideways', strategy: 'iron_condor', track_status: 'Inside Track', track_safe: false, smoke_score: 0 },
    { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', cmp: 1685.0, weekly_rsi: 71.4, daily_rsi: 68.9, signal: 'Strong Bullish', strategy: 'hedge_put', track_status: 'Safe (Outside S1)', track_safe: true, smoke_score: 0 },
    { symbol: 'ITC', name: 'ITC', sector: 'FMCG', cmp: 467.8, weekly_rsi: 35.2, daily_rsi: 33.1, signal: 'Strong Bearish', strategy: 'hedge_call', track_status: 'Safe (Outside R1)', track_safe: true, smoke_score: 2 },
    { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', sector: 'Banking', cmp: 1923.4, weekly_rsi: 58.9, daily_rsi: 55.2, signal: 'Sideways', strategy: 'iron_condor', track_status: 'Safe (Both Outside)', track_safe: true, smoke_score: 0 },
    { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Infrastructure', cmp: 3456.7, weekly_rsi: 62.3, daily_rsi: 38.5, signal: 'Wait', strategy: 'wait', track_status: 'Wait (No Signal)', track_safe: false, smoke_score: 1 },
    { symbol: 'MARUTI', name: 'Maruti Suzuki', sector: 'Auto', cmp: 11230.0, weekly_rsi: 49.5, daily_rsi: 51.2, signal: 'Sideways', strategy: 'iron_condor', track_status: 'Inside Track', track_safe: false, smoke_score: 0 },
    { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', cmp: 2520.0, weekly_rsi: 33.8, daily_rsi: 36.5, signal: 'Strong Bearish', strategy: 'hedge_call', track_status: 'Safe (Outside R1)', track_safe: true, smoke_score: 0 },
    { symbol: 'NIFTY', name: 'Nifty 50 Index', sector: 'Index', cmp: 24820.0, weekly_rsi: 56.4, daily_rsi: 58.1, signal: 'Sideways', strategy: 'iron_condor', track_status: 'Safe (Both Outside)', track_safe: true, smoke_score: 0 },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty Index', sector: 'Index', cmp: 52450.0, weekly_rsi: 53.2, daily_rsi: 51.0, signal: 'Sideways', strategy: 'iron_condor', track_status: 'Safe (Both Outside)', track_safe: true, smoke_score: 0 },
  ]
}
