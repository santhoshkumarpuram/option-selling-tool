import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  X,
  ExternalLink,
  Shield,
  Clock,
  Layers
} from 'lucide-react'
import clsx from 'clsx'
import api from '../services/api'

export default function Positions() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    loadPositions()
    const timer = setInterval(loadPositions, 20000)
    return () => clearInterval(timer)
  }, [filter])

  async function loadPositions() {
    try {
      const data = await api.getPositions(filter === 'all' ? null : filter)
      setPositions(data)
    } catch (err) {
      console.error('Failed to load positions:', err)
      setPositions(getDemoPositions())
    } finally {
      setLoading(false)
    }
  }

  async function handleClose(posId) {
    if (!confirm('Are you sure you want to close this position?')) return
    try {
      await api.closePosition(posId)
      await loadPositions()
    } catch (err) {
      alert(`Error closing position: ${err.message}`)
    }
  }

  const totalRealized = positions.filter(p => p.status === 'closed').reduce((acc, p) => acc + (p.pnl || 0), 0)
  const totalUnrealized = positions.filter(p => p.status === 'open').reduce((acc, p) => acc + (p.pnl || 0), 0)
  const totalPnl = totalRealized + totalUnrealized
  const totalMargin = positions.filter(p => p.status === 'open').reduce((acc, p) => acc + (p.margin_required || 60000), 0)
  const totalOpenLots = positions.filter(p => p.status === 'open').reduce((acc, p) => acc + (p.lots || 1), 0)
  const monthlyRoi = totalMargin > 0 ? ((totalPnl / totalMargin) * 100).toFixed(2) : '0.00'

  return (
    <div className="p-3.5 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Positions & P&L Tracker</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real & Paper trades with live Smoke Detector monitoring & Stop-Loss alerts
          </p>
        </div>

        <div className="flex bg-[var(--color-bg-card)] border border-[var(--color-border)] p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
          {['open', 'closed', 'all'].map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={clsx(
                'px-3 sm:px-4 py-1.5 rounded-lg capitalize transition-colors',
                filter === t
                  ? 'bg-[var(--color-primary)] text-black'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {t} Positions
            </button>
          ))}
        </div>
      </div>

      {/* Portfolio Performance Banner (Like Kathuria's Tool) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 sm:p-4 rounded-xl shadow-lg">
        <SummaryItem label="Open Lots" value={`${totalOpenLots} Lots`} color="text-amber-400" />
        <SummaryItem label="Margin Used" value={`₹${totalMargin.toLocaleString('en-IN')}`} />
        <SummaryItem label="Realised P&L" value={`₹${totalRealized.toLocaleString('en-IN')}`} color={totalRealized >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
        <SummaryItem label="Unrealised P&L" value={`₹${totalUnrealized.toLocaleString('en-IN')}`} color={totalUnrealized >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
        <SummaryItem label="Total Return" value={`₹${totalPnl.toLocaleString('en-IN')}`} color={totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
        <SummaryItem label="Monthly ROI %" value={`${monthlyRoi}%`} color="text-[var(--color-primary)]" />
      </div>

      {/* Positions List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading positions...</div>
        ) : positions.length === 0 ? (
          <div className="text-center py-16 bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-8">
            <Layers className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-300 font-semibold">No {filter} positions found</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">Scan the Nifty 50 universe to find your next high-probability setup</p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--color-primary)] text-black rounded-lg text-xs font-bold hover:bg-[var(--color-primary-dark)] transition-colors"
            >
              Open Stock Scanner
            </Link>
          </div>
        ) : (
          positions.map((pos, idx) => (
            <div
              key={pos.id || idx}
              className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 sm:p-5 shadow-md space-y-3.5 sm:space-y-4 hover:border-slate-700 transition-colors"
            >
              {/* Top row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-lg font-black text-white">{pos.symbol}</span>
                  <span
                    className={clsx(
                      'px-2.5 py-0.5 rounded-full text-xs font-bold',
                      pos.strategy_type?.includes('Put')
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : pos.strategy_type?.includes('Call')
                        ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                    )}
                  >
                    {pos.strategy_type}
                  </span>

                  {/* Lots Pill */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-bold">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>{pos.lots || 1} Lot{(pos.lots || 1) > 1 ? 's' : ''} ({((pos.lots || 1) * (pos.lot_size || 250)).toLocaleString('en-IN')} shares)</span>
                  </span>

                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Expiry: {pos.expiry}
                  </span>

                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {pos.is_paper ? 'PAPER' : 'REAL'}
                  </span>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-1 sm:pt-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {(pos.smoke_score || 0) >= 2 ? (
                      <span className="text-rose-400 flex items-center gap-1 bg-rose-500/15 px-2 py-0.5 rounded-full border border-rose-500/30">
                        <AlertTriangle className="w-3.5 h-3.5" /> Smoke Alert: {pos.smoke_score}/3
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Smoke: OK ({pos.smoke_score || 0}/3)
                      </span>
                    )}
                  </div>

                  {pos.status === 'open' && (
                    <button
                      onClick={() => handleClose(pos.id)}
                      className="px-3 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Close Position
                    </button>
                  )}
                </div>
              </div>

              {/* Stats Grid with No. of Lots included */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 text-xs">
                <MiniCard
                  label="No. of Lots"
                  value={`${pos.lots || 1} Lot${(pos.lots || 1) > 1 ? 's' : ''}`}
                  subtext={`${((pos.lots || 1) * (pos.lot_size || 250)).toLocaleString('en-IN')} shares`}
                  color="text-amber-300"
                  bold
                />
                <MiniCard
                  label="Total P&L"
                  value={`₹${(pos.pnl || 0).toLocaleString('en-IN')}`}
                  color={(pos.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                  bold
                />
                <MiniCard label="Max Profit" value={`₹${(pos.max_profit || 0).toLocaleString('en-IN')}`} color="text-emerald-400" />
                <MiniCard label="Max Loss" value={`-₹${(pos.max_loss || 0).toLocaleString('en-IN')}`} color="text-rose-400" />
                <MiniCard label="Entry POP" value={`${pos.pop_at_entry || 90}%`} color="text-[var(--color-primary)]" />
                <MiniCard label="Stock CMP" value={`₹${pos.stock_now || '—'}`} />
                <MiniCard label="Stop-Loss Rule" value={`${pos.stop_loss_rule || '1:2'} Stop`} color="text-amber-400" />
              </div>

              {/* Legs Table */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Position Legs:</span>
                {(pos.legs || []).map((leg, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-1 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg text-xs font-mono"
                  >
                    <span className={clsx('font-bold', leg.action === 'SELL' ? 'text-amber-400' : 'text-blue-400')}>
                      {leg.action}
                    </span>
                    <span className="text-white font-bold">{leg.strike}{leg.option_type}</span>
                    <span className="text-slate-400">@₹{leg.premium}</span>
                    <span className="text-[10px] text-amber-300 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                      {leg.lots || pos.lots || 1} lot{(leg.lots || pos.lots || 1) > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function SummaryItem({ label, value, color = 'text-white' }) {
  return (
    <div className="text-center p-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">{label}</div>
      <div className={clsx('text-base font-black font-mono', color)}>{value}</div>
    </div>
  )
}

function MiniCard({ label, value, subtext = null, color = 'text-slate-200', bold = false }) {
  return (
    <div className="p-2.5 bg-[var(--color-bg-dark)]/80 rounded-lg border border-[var(--color-border)] flex flex-col justify-between">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">{label}</div>
        <div className={clsx('font-mono', bold ? 'text-sm font-black' : 'text-xs font-bold', color)}>{value}</div>
      </div>
      {subtext && <div className="text-[10px] text-slate-500 font-mono mt-1">{subtext}</div>}
    </div>
  )
}

function getDemoPositions() {
  return [
    {
      id: 1,
      symbol: 'MARUTI',
      strategy_type: 'Bear Call Spread',
      expiry: '2026-11-26',
      lots: 2,
      lot_size: 50,
      is_paper: 1,
      status: 'open',
      pnl: 1420,
      max_profit: 3500,
      max_loss: 16500,
      pop_at_entry: 92.4,
      stock_now: 11230.0,
      margin_required: 61270,
      smoke_score: 0,
      stop_loss_rule: '1:2',
      legs: [
        { action: 'SELL', option_type: 'CE', strike: 11600, premium: 24.5, lots: 2 },
        { action: 'BUY', option_type: 'CE', strike: 11800, premium: 7.0, lots: 2 },
      ],
    },
    {
      id: 2,
      symbol: 'SBIN',
      strategy_type: 'Bull Put Spread',
      expiry: '2026-11-26',
      lots: 2,
      lot_size: 750,
      is_paper: 1,
      status: 'open',
      pnl: 2025,
      max_profit: 2850,
      max_loss: 19650,
      pop_at_entry: 94.1,
      stock_now: 958.6,
      margin_required: 96200,
      smoke_score: 0,
      stop_loss_rule: '1:2',
      legs: [
        { action: 'SELL', option_type: 'PE', strike: 920, premium: 2.9, lots: 2 },
        { action: 'BUY', option_type: 'PE', strike: 900, premium: 1.0, lots: 2 },
      ],
    },
    {
      id: 3,
      symbol: 'HDFCBANK',
      strategy_type: 'Iron Condor',
      expiry: '2026-10-29',
      lots: 1,
      lot_size: 550,
      is_paper: 1,
      status: 'closed',
      pnl: 4410,
      max_profit: 4410,
      max_loss: 17590,
      pop_at_entry: 88.5,
      stock_now: 1785.0,
      margin_required: 55000,
      smoke_score: 0,
      stop_loss_rule: '1:2',
      legs: [
        { action: 'SELL', option_type: 'CE', strike: 1840, premium: 4.5, lots: 1 },
        { action: 'BUY', option_type: 'CE', strike: 1880, premium: 1.2, lots: 1 },
        { action: 'SELL', option_type: 'PE', strike: 1720, premium: 4.8, lots: 1 },
        { action: 'BUY', option_type: 'PE', strike: 1680, premium: 1.1, lots: 1 },
      ],
    },
  ]
}
