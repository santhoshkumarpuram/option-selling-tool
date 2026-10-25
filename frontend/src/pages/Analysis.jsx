import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Flame,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  HelpCircle,
  Check,
  Zap,
  Play
} from 'lucide-react'
import clsx from 'clsx'
import api from '../services/api'

export default function Analysis() {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedStrategy, setSelectedStrategy] = useState('hedge_put')
  const [lots, setLots] = useState(1)
  const [stopLossRule, setStopLossRule] = useState('1:2')
  const [tradePlan, setTradePlan] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [orderModal, setOrderModal] = useState({ open: false, type: 'paper' })
  const [orderStatus, setOrderStatus] = useState(null)

  useEffect(() => {
    loadAnalysis()
  }, [symbol])

  useEffect(() => {
    if (data) {
      recalculateStrategy(selectedStrategy, lots, stopLossRule)
    }
  }, [selectedStrategy, lots, stopLossRule, data])

  async function loadAnalysis() {
    setLoading(true)
    try {
      const res = await api.getAnalysis(symbol)
      setData(res)
      const strat = res.recommended_strategy !== 'wait' ? res.recommended_strategy : 'hedge_put'
      setSelectedStrategy(strat)
      setTradePlan(res.trade)
    } catch (err) {
      console.error('Failed to load analysis:', err)
      const demo = getDemoAnalysis(symbol)
      setData(demo)
      setSelectedStrategy(demo.recommended_strategy)
      setTradePlan(demo.trade)
    } finally {
      setLoading(false)
    }
  }

  async function recalculateStrategy(stratType, numLots, sl) {
    setCalculating(true)
    try {
      const plan = await api.calculateStrategy({
        symbol,
        strategy_type: stratType,
        lots: numLots,
        stop_loss_rule: sl,
      })
      setTradePlan(plan)
    } catch (err) {
      console.error('Error recalculating strategy:', err)
    } finally {
      setCalculating(false)
    }
  }

  async function handleExecuteOrder(isPaper = true) {
    if (!tradePlan) return

    // Mismatch warning check
    if (data && selectedStrategy !== data.recommended_strategy) {
      const recLabel = data.recommended_strategy === 'hedge_put'
        ? 'Bull Put Spread (Hedge Put)'
        : data.recommended_strategy === 'hedge_call'
        ? 'Bear Call Spread (Hedge Call)'
        : data.recommended_strategy === 'iron_condor'
        ? 'Iron Condor'
        : 'WAIT (No Trade)'

      const selLabel = selectedStrategy === 'hedge_put'
        ? 'Bull Put Spread'
        : selectedStrategy === 'hedge_call'
        ? 'Bear Call Spread'
        : 'Iron Condor'

      const msg = `⚠️ STRATEGY MISMATCH WARNING:\n\n` +
        `The DSRD analysis recommends: ${recLabel}.\n` +
        `You have selected: ${selLabel}.\n\n` +
        `Kathuria Rule: Trading against the RSI trend significantly increases the risk of loss.\n\n` +
        `Do you still want to execute this trade against the DSRD recommendation?`

      if (!window.confirm(msg)) {
        return
      }
    }

    if (!isPaper) {
      // Check market hours in IST
      const now = new Date()
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
      const ist = new Date(utc + (3600000 * 5.5))
      const day = ist.getDay() // 0 = Sun, 6 = Sat
      const timeNum = ist.getHours() * 60 + ist.getMinutes()
      const isOpen = (day >= 1 && day <= 5) && (timeNum >= 555 && timeNum <= 930) // 9:15 AM to 3:30 PM

      if (!isOpen) {
        alert(
          "🔴 NSE Market is currently CLOSED.\n\n" +
          `Current Time: ${ist.toLocaleDateString('en-IN', { weekday: 'long' })}, ${ist.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} IST.\n\n` +
          "National Stock Exchange (NSE) F&O trading hours are Monday to Friday, 9:15 AM to 3:30 PM IST.\n\n" +
          "Regular live broker orders cannot be executed on the exchange right now.\n\n" +
          "Tip: Click 'Execute Paper Trade' to simulate, test, and track this position in your portfolio, or place it during live market hours on Monday."
        )
        return
      }
    }

    try {
      const res = await api.placeOrder({
        symbol: data.symbol,
        strategy_type: selectedStrategy,
        expiry: data.expiry || '2026-11-26',
        legs: tradePlan.legs,
        lots: lots,
        lot_size: tradePlan.lot_size,
        net_credit: tradePlan.net_credit_per_share,
        max_profit: tradePlan.max_profit,
        max_loss: tradePlan.max_loss,
        pop: tradePlan.pop,
        stop_loss_rule: stopLossRule,
        is_paper: isPaper,
      })
      setOrderStatus(res)
      setTimeout(() => {
        navigate('/positions')
      }, 1500)
    } catch (err) {
      alert(`Order Placement Failed:\n\n${err.response?.data?.detail || err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full mx-auto mb-3" />
        <p>Running multi-timeframe DSRD analysis for {symbol}...</p>
      </div>
    )
  }

  if (!data) return <div className="p-8 text-center">Data not available</div>

  const cmp = data.cmp || 1000.0
  const nearestSup = data.support_levels?.[0]?.price || cmp * 0.95
  const nearestRes = data.resistance_levels?.[0]?.price || cmp * 1.05
  const distToRes = (((nearestRes - cmp) / cmp) * 100).toFixed(1)
  const distToSup = (((cmp - nearestSup) / cmp) * 100).toFixed(1)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 bg-[var(--color-bg-card)] hover:bg-[var(--color-bg-card-hover)] border border-[var(--color-border)] rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">{data.symbol}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-medium">
                {data.sector}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{data.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Current Price (CMP)</div>
            <div className="text-2xl font-mono font-black text-white">
              ₹{cmp.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="text-right border-l border-[var(--color-border)] pl-6">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">DSRD Verdict</div>
            <span
              className={clsx(
                'inline-block px-3 py-1 rounded-full text-xs font-bold mt-0.5',
                data.signal.includes('Bullish')
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : data.signal.includes('Bearish')
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : data.signal === 'Sideways'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-slate-700/40 text-slate-300 border border-slate-600'
              )}
            >
              {data.signal}
            </span>
          </div>
        </div>
      </div>

      {/* 4-Step DSRD Checklist Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* STEP 1: D — Direction (RSI Framework) */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[var(--color-primary)] text-black font-black text-xs flex items-center justify-center">
                D
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Direction — Dual RSI
              </h2>
            </div>
            <span className="text-xs text-slate-400">Timeframes: Weekly + Daily</span>
          </div>

          <div className="space-y-4">
            <RSIBar label="Weekly RSI (Broad Trend)" value={data.weekly_rsi} />
            <RSIBar label="Daily RSI (Immediate Momentum)" value={data.daily_rsi} />
          </div>

          <div className="p-3 bg-[var(--color-bg-dark)]/70 rounded-lg border border-[var(--color-border)] text-xs space-y-1.5">
            <div className="font-semibold text-slate-200">Kathuria's Double-Engine Principle:</div>
            <p className="text-slate-400 leading-relaxed">
              {data.weekly_rsi >= 60 && data.daily_rsi >= 60
                ? 'Both Weekly & Daily RSIs exceed 60. Powerful bullish momentum confirmed. Rule: Sell OTM Put options and hedge.'
                : data.weekly_rsi <= 40 && data.daily_rsi <= 40
                ? 'Both Weekly & Daily RSIs are below 40. Strong bearish trend confirmed. Rule: Sell OTM Call options and hedge.'
                : data.weekly_rsi > 40 && data.weekly_rsi < 60 && data.daily_rsi > 40 && data.daily_rsi < 60
                ? 'Both RSIs are resting comfortably between 40 and 60. The stock is range-bound / sideways. Rule: Sell Iron Condor.'
                : 'RSIs are in disagreement. Rule: "When they fight, WAIT. We do not trade confusion."'}
            </p>
          </div>
        </div>

        {/* STEP 2: S+R — Support & Resistance (Railway Tracks) */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[var(--color-primary)] text-black font-black text-xs flex items-center justify-center">
                S+R
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Support & Resistance — Railway Tracks
              </h2>
            </div>
            <span className="text-xs text-amber-400 font-semibold">Stay Outside The Tracks</span>
          </div>

          <div className="space-y-2">
            {/* Resistance Levels */}
            {(data.resistance_levels || []).slice(0, 2).map((lvl, i) => (
              <div key={`r-${i}`} className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs">
                <span className="font-bold text-rose-400">R{i + 1} (Resistance Ceiling)</span>
                <span className="font-mono font-bold text-white">₹{lvl.price}</span>
                <span className="text-slate-400">{lvl.timeframe} · {lvl.touches} touches (+{(((lvl.price - cmp) / cmp) * 100).toFixed(1)}%)</span>
              </div>
            ))}

            {/* Current Price Marker */}
            <div className="p-2.5 rounded-lg bg-[var(--color-bg-dark)] border-2 border-[var(--color-primary)] flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-[var(--color-primary)]">
                <span className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-ping" />
                CMP (Spot Center)
              </div>
              <span className="font-mono font-black text-sm text-white">₹{cmp}</span>
              <span className="text-[11px] text-slate-400">
                Gap to R: +{distToRes}% | Gap to S: -{distToSup}%
              </span>
            </div>

            {/* Support Levels */}
            {(data.support_levels || []).slice(0, 2).map((lvl, i) => (
              <div key={`s-${i}`} className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="font-bold text-emerald-400">S{i + 1} (Support Floor)</span>
                <span className="font-mono font-bold text-white">₹{lvl.price}</span>
                <span className="text-slate-400">{lvl.timeframe} · {lvl.touches} touches (-{(((cmp - lvl.price) / cmp) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
            <strong>Railway Track Rule:</strong> Never sell a Call below Resistance (R1: ₹{nearestRes}) or Put above Support (S1: ₹{nearestSup}). Selling inside the tracks invites catastrophic tail risk.
          </div>
        </div>

        {/* STEP 3: D — Delta-Based Strike Picking (0.07 to 0.15 Delta) */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-[var(--color-primary)] text-black font-black text-xs flex items-center justify-center">
                D
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Delta Strike Selection (0.07 – 0.15)
              </h2>
            </div>
            <span className="text-xs text-emerald-400 font-semibold">85% to 93% Win Probability</span>
          </div>

          <p className="text-xs text-slate-400">
            Sanjay Kathuria's Golden Delta sweet spot: strikes close enough to yield 1.5–3% monthly ROI, but far enough outside S/R tracks for safety. Strikes inside the tracks are strictly excluded from automated trade generation.
          </p>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {(data.suggested_strikes || []).length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-4">No strikes in 0.07-0.15 delta</div>
            ) : (
              (data.suggested_strikes || []).map((s, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors',
                    s.aligned
                      ? 'bg-emerald-500/5 border-emerald-500/25 hover:bg-emerald-500/10'
                      : 'bg-rose-500/5 border-rose-500/25 hover:bg-rose-500/10'
                  )}
                >
                  <div className="flex items-center gap-2 font-mono">
                    <span className={clsx('font-bold px-1.5 py-0.5 rounded text-[11px]', s.type === 'CE' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300')}>
                      {s.type}
                    </span>
                    <span className="font-bold text-white text-sm">₹{s.strike}</span>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-slate-300">Δ {s.delta.toFixed(2)}</span>
                    <span className="font-mono text-white font-semibold">₹{s.premium.toFixed(2)}</span>
                    <span className={clsx('flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full', s.aligned ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300')}>
                      {s.aligned ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {s.aligned ? 'Safe (Outside Track)' : 'Inside Track (Avoid)'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* STEP 4: Smoke Detector (3-Point Early Reversal Warning) */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                🔥
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Smoke Detector — Reversal Warning
              </h2>
            </div>
            <span
              className={clsx(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                (data.smoke?.score || 0) >= 2
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              )}
            >
              Confluence: {data.smoke?.score || 0}/3 Signals
            </span>
          </div>

          <div className="space-y-3">
            <SmokeSignalRow
              title="1. Bollinger Squeeze"
              active={data.smoke?.bollinger === 'active'}
              detail={data.smoke?.bollinger_detail}
            />
            <SmokeSignalRow
              title="2. RSI Divergence"
              active={data.smoke?.rsi_divergence === 'active'}
              detail={data.smoke?.rsi_divergence_detail}
            />
            <SmokeSignalRow
              title="3. Candlestick Pattern"
              active={data.smoke?.candlestick === 'active'}
              detail={data.smoke?.candlestick_detail}
            />
          </div>

          <div className="p-3 bg-[var(--color-bg-dark)]/70 rounded-lg border border-[var(--color-border)] text-xs text-slate-400">
            <strong>Rule:</strong> 3/3 = High danger of fire, do not enter new trades; 2/3 = Smoke detected, prepare alerts; 0–1/3 = Low reversal risk.
          </div>
        </div>
      </div>

      {/* Trade Builder & Payoff Dashboard */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-[var(--color-primary)]" />
              Strategy Builder & Risk-Managed Execution
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Always hedged: defined maximum risk, known probability of profit, predefined stop-loss
            </p>
          </div>

          {/* Strategy Selector Chips */}
          <div className="flex flex-wrap gap-1 bg-[var(--color-bg-dark)] p-1 rounded-xl border border-[var(--color-border)]">
            {[
              { id: 'hedge_put', label: 'Bull Put Spread (Hedge Put)' },
              { id: 'hedge_call', label: 'Bear Call Spread (Hedge Call)' },
              { id: 'iron_condor', label: 'Iron Condor (Sideways)' },
            ].map(s => {
              const isRec = data.recommended_strategy === s.id
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStrategy(s.id)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                    selectedStrategy === s.id
                      ? 'bg-[var(--color-primary)] text-black shadow'
                      : 'text-slate-400 hover:text-white',
                    isRec && selectedStrategy !== s.id && 'ring-1 ring-emerald-500/60 bg-emerald-500/5 text-emerald-300'
                  )}
                >
                  <span>{s.label}</span>
                  {isRec && (
                    <span
                      className={clsx(
                        'text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider',
                        selectedStrategy === s.id
                          ? 'bg-black/30 text-amber-950 font-black'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      )}
                    >
                      ★ Suggested
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Strategy Mismatch Warning Banner */}
        {selectedStrategy !== data.recommended_strategy && (
          <div className="p-4 rounded-xl border-2 border-rose-500/50 bg-rose-950/20 text-rose-200 text-xs space-y-2 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/20 pb-2">
              <div className="flex items-center gap-2 font-black text-sm text-rose-300">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
                <span>
                  STRATEGY MISMATCH WARNING: {selectedStrategy === 'hedge_put' ? 'Put Spread (Bull Put) NOT Suggested!' : selectedStrategy === 'hedge_call' ? 'Call Spread (Bear Call) NOT Suggested!' : 'Iron Condor NOT Suggested!'}
                </span>
              </div>

              {data.recommended_strategy !== 'wait' && (
                <button
                  onClick={() => setSelectedStrategy(data.recommended_strategy)}
                  className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1"
                >
                  <span>Switch to Suggested: {data.recommended_strategy === 'hedge_put' ? 'Bull Put Spread' : data.recommended_strategy === 'hedge_call' ? 'Bear Call Spread' : 'Iron Condor'}</span>
                </button>
              )}
            </div>

            <div className="text-slate-200 leading-relaxed space-y-1 pt-1">
              {data.recommended_strategy === 'hedge_call' && selectedStrategy === 'hedge_put' && (
                <div>
                  <p>
                    The DSRD system analyzed <strong className="text-white font-bold">{data.symbol}</strong> and identified a <strong className="text-rose-400 font-bold">Bearish Trend</strong> (Weekly RSI: {data.weekly_rsi}, Daily RSI: {data.daily_rsi}). Selling Put options here goes against the prevailing downtrend, exposing your position to direct breach risk.
                  </p>
                  <p className="italic text-amber-300 font-medium">
                    Sanjay Kathuria Rule: "Stocks give a clear indicator of their mood. If a stock is shouting it is going down, why are you selling a put? You will get wiped out. Only sell calls and hedge!"
                  </p>
                </div>
              )}

              {data.recommended_strategy === 'hedge_put' && selectedStrategy === 'hedge_call' && (
                <div>
                  <p>
                    The DSRD system analyzed <strong className="text-white font-bold">{data.symbol}</strong> and identified a <strong className="text-emerald-400 font-bold">Bullish Trend</strong> (Weekly RSI: {data.weekly_rsi}, Daily RSI: {data.daily_rsi}). Selling Call options here attempts to fight powerful upside momentum.
                  </p>
                  <p className="italic text-amber-300 font-medium">
                    Sanjay Kathuria Rule: "The trend is your friend. If TCS is in a mood to go up, up, up... why are you selling a call? Never sell calls against a surging elephant stock!"
                  </p>
                </div>
              )}

              {data.recommended_strategy === 'wait' && (
                <div>
                  <p>
                    The DSRD system gives a <strong className="text-amber-400 font-bold">WAIT signal</strong> because Weekly and Daily RSIs are conflicting (one bullish, one bearish).
                  </p>
                  <p className="italic text-amber-300 font-medium">
                    Sanjay Kathuria Rule: "Double engine is required. When the center and state disagree, we WAIT. We do not trade confusion!"
                  </p>
                </div>
              )}

              {data.recommended_strategy === 'iron_condor' && selectedStrategy !== 'iron_condor' && (
                <div>
                  <p>
                    Both RSIs are resting comfortably between 40 and 60 (<strong className="text-indigo-300">Sideways Neutral</strong>). An Iron Condor was suggested to harvest premium from both sides safely. Switching to a single directional spread introduces unnecessary directional risk.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inputs row: Lots and Stop Loss */}
        <div className="flex flex-wrap items-center gap-6 p-4 bg-[var(--color-bg-dark)]/80 rounded-xl border border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Number of Lots:</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLots(Math.max(1, lots - 1))}
                className="w-8 h-8 rounded bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
              >
                -
              </button>
              <span className="w-8 text-center font-mono font-bold text-white">{lots}</span>
              <button
                onClick={() => setLots(lots + 1)}
                className="w-8 h-8 rounded bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors"
              >
                +
              </button>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              ({(tradePlan?.lot_size || 250) * lots} shares)
            </span>
          </div>

          <div className="flex items-center gap-3 border-l border-[var(--color-border)] pl-6">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Stop Loss Rule:</label>
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700 text-xs">
              {['1:1', '1:2', '1:3'].map(rule => (
                <button
                  key={rule}
                  onClick={() => setStopLossRule(rule)}
                  className={clsx(
                    'px-2.5 py-1 rounded font-semibold transition-colors',
                    stopLossRule === rule
                      ? 'bg-[var(--color-primary)] text-black'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {rule}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400">
              {stopLossRule === '1:1' ? 'Max Loss = 1x Profit' : stopLossRule === '1:2' ? 'Max Loss = 2x Profit' : 'Max Loss = 3x Profit'}
            </span>
          </div>
        </div>

        {/* Railway Track Safety Notice */}
        {tradePlan?.warning_note && (
          <div
            className={clsx(
              'p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed',
              tradePlan.track_violation
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
            )}
          >
            <AlertTriangle className={clsx('w-5 h-5 shrink-0 mt-0.5', tradePlan.track_violation ? 'text-rose-400' : 'text-amber-400')} />
            <div>
              <div className="font-bold text-sm mb-0.5 text-white">
                {tradePlan.track_violation ? '🚫 Railway Track Safety Alert (Trade Blocked)' : '🛡️ Kathuria Railway Safety Rule Enforced'}
              </div>
              <p>{tradePlan.warning_note}</p>
            </div>
          </div>
        )}

        {/* Payoff Key Performance Metrics */}
        {tradePlan && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            <MetricCard
              label="Net Credit"
              value={`₹${tradePlan.net_credit_per_share?.toFixed(2)}`}
              subtext="/ share"
              color="text-emerald-400"
            />
            <MetricCard
              label="Max Profit"
              value={`₹${tradePlan.max_profit?.toLocaleString('en-IN')}`}
              subtext="Capped gain"
              color="text-emerald-400"
            />
            <MetricCard
              label="Max Loss"
              value={`-₹${tradePlan.max_loss?.toLocaleString('en-IN')}`}
              subtext="Defined buffer"
              color="text-rose-400"
            />
            <MetricCard
              label="Win Prob (POP)"
              value={`${tradePlan.pop}%`}
              subtext="Statistical probability"
              color="text-[var(--color-primary)]"
            />
            <MetricCard
              label="Margin Needed"
              value={`₹${tradePlan.margin_required?.toLocaleString('en-IN')}`}
              subtext="Approx SPAN margin"
              color="text-white"
            />
            <MetricCard
              label="Expected ROI"
              value={`${tradePlan.roi}%`}
              subtext="Monthly return"
              color="text-[var(--color-primary)]"
            />
            <MetricCard
              label="Stop-Loss Trigger"
              value={`-₹${tradePlan.stop_loss_amount?.toLocaleString('en-IN')}`}
              subtext={`${stopLossRule} rule`}
              color="text-amber-400"
            />
          </div>
        )}

        {/* Option Legs Breakdown Table */}
        {tradePlan?.legs && (
          <div className="border border-[var(--color-border)] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-bg-dark)]/80 text-slate-400 font-semibold uppercase tracking-wider border-b border-[var(--color-border)]">
                <tr>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Type</th>
                  <th className="py-2.5 px-4">Strike</th>
                  <th className="py-2.5 px-4">Premium (LTP)</th>
                  <th className="py-2.5 px-4">Lots</th>
                  <th className="py-2.5 px-4 text-right">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {tradePlan.legs.map((leg, i) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 font-bold">
                      <span className={clsx('px-2 py-0.5 rounded text-[11px]', leg.action === 'SELL' ? 'bg-amber-500/20 text-amber-300 font-extrabold' : 'bg-blue-500/20 text-blue-300')}>
                        {leg.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-bold text-white">{leg.option_type}</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-sm text-white">₹{leg.strike}</td>
                    <td className="py-2.5 px-4 font-mono text-slate-200">₹{leg.premium?.toFixed(2)}</td>
                    <td className="py-2.5 px-4 text-slate-300">{leg.lots} lot(s)</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-400">
                      {leg.action === 'SELL' ? 'Income Generator (Collect Premium)' : 'Hedge / Downside Insurance (Cap Risk)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Execution Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 mr-auto">
            {(() => {
              const now = new Date()
              const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
              const ist = new Date(utc + (3600000 * 5.5))
              const day = ist.getDay()
              const timeNum = ist.getHours() * 60 + ist.getMinutes()
              const isOpen = (day >= 1 && day <= 5) && (timeNum >= 555 && timeNum <= 930)

              return (
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border',
                    isOpen
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                  )}
                >
                  <span className={clsx('w-2 h-2 rounded-full', isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400')} />
                  <span>{isOpen ? 'NSE Market Open' : 'NSE Market Closed (Mon-Fri 9:15 AM – 3:30 PM IST)'}</span>
                </span>
              )
            })()}

            {orderStatus && (
              <span className="text-xs text-emerald-400 font-semibold ml-2">
                ✓ {orderStatus.message} — Redirecting to positions...
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleExecuteOrder(true)}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 transition-colors flex items-center justify-center gap-2 shadow"
            >
              <Play className="w-4 h-4 text-amber-400" />
              <span>Execute Paper Trade</span>
            </button>

            <button
              onClick={() => handleExecuteOrder(false)}
              disabled={tradePlan?.track_violation}
              className={clsx(
                'w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg',
                tradePlan?.track_violation
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black'
              )}
            >
              <Zap className="w-4 h-4" />
              <span>{tradePlan?.track_violation ? 'Trade Blocked (Inside Track)' : 'Place Live Broker Order'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RSIBar({ label, value }) {
  if (value == null) return null
  const isBull = value >= 60.0
  const isBear = value <= 40.0
  const zoneLabel = isBull ? 'Bullish Zone (>60)' : isBear ? 'Bearish Zone (<40)' : 'Neutral Zone (40-60)'
  const color = isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-indigo-400'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-300 font-medium">{label}</span>
        <span className={clsx('font-mono font-bold', color)}>
          {value.toFixed(1)} — {zoneLabel}
        </span>
      </div>
      <div className="h-2.5 bg-slate-900 rounded-full overflow-hidden relative border border-slate-800">
        <div className="absolute inset-0 flex">
          <div className="w-[40%] bg-rose-500/20" title="Bearish (0-40)" />
          <div className="w-[20%] bg-indigo-500/20" title="Neutral (40-60)" />
          <div className="w-[40%] bg-emerald-500/20" title="Bullish (60-100)" />
        </div>
        <div
          className={clsx('absolute top-0 bottom-0 w-1.5 rounded-full shadow', isBull ? 'bg-emerald-400' : isBear ? 'bg-rose-400' : 'bg-indigo-400')}
          style={{ left: `${Math.min(98, Math.max(2, value))}%` }}
        />
      </div>
    </div>
  )
}

function SmokeSignalRow({ title, active, detail }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-[var(--color-bg-dark)]/50 border border-[var(--color-border)] text-xs">
      <div className="mt-0.5 shrink-0">
        {active ? (
          <AlertTriangle className="w-4 h-4 text-rose-400" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        )}
      </div>
      <div>
        <div className={clsx('font-bold', active ? 'text-rose-300' : 'text-slate-200')}>
          {title}
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">{detail || 'Normal'}</div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, subtext, color }) {
  return (
    <div className="p-3 bg-[var(--color-bg-dark)] rounded-xl border border-[var(--color-border)] text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</div>
      <div className={clsx('text-base font-black font-mono', color)}>{value}</div>
      <div className="text-[10px] text-slate-500 mt-0.5">{subtext}</div>
    </div>
  )
}

function getDemoAnalysis(symbol) {
  return {
    symbol,
    name: symbol === 'RELIANCE' ? 'Reliance Industries' : symbol,
    sector: 'Oil & Gas',
    cmp: 1285.5,
    weekly_rsi: 38.2,
    daily_rsi: 44.1,
    signal: 'Bearish Bounce',
    recommended_strategy: 'hedge_call',
    support_levels: [
      { price: 1205.0, timeframe: 'D+W+M', touches: 6 },
      { price: 1150.0, timeframe: 'D+W', touches: 4 },
    ],
    resistance_levels: [
      { price: 1320.0, timeframe: 'D+W+M', touches: 7 },
      { price: 1380.0, timeframe: 'D+W', touches: 3 },
    ],
    suggested_strikes: [
      { type: 'CE', strike: 1340, delta: 0.09, premium: 5.5, aligned: true },
      { type: 'CE', strike: 1320, delta: 0.14, premium: 8.8, aligned: true },
      { type: 'PE', strike: 1180, delta: 0.08, premium: 4.8, aligned: true },
    ],
    smoke: {
      bollinger: 'inactive',
      bollinger_detail: 'Normal band width, price within channels',
      rsi_divergence: 'inactive',
      rsi_divergence_detail: 'No divergence detected in past 20 bars',
      candlestick: 'inactive',
      candlestick_detail: 'No reversal candle in past 5 bars',
      score: 0,
    },
    trade: {
      strategy_type: 'hedge_call',
      lots: 1,
      lot_size: 250,
      legs: [
        { action: 'SELL', option_type: 'CE', strike: 1340, premium: 5.5, lots: 1 },
        { action: 'BUY', option_type: 'CE', strike: 1380, premium: 1.8, lots: 1 },
      ],
      net_credit_per_share: 3.7,
      max_profit: 925,
      max_loss: 9075,
      pop: 91.0,
      roi: 2.2,
      margin_required: 42000,
      stop_loss_amount: 1850,
    },
  }
}
