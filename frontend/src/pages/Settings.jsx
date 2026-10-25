import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  Sliders,
  HelpCircle,
  ExternalLink
} from 'lucide-react'
import clsx from 'clsx'
import api from '../services/api'

const BROKERS = [
  {
    id: 'dhan',
    name: 'Dhan (DhanHQ)',
    tagline: 'Direct NSE Option Chain & Greeks API',
    docsUrl: 'https://dhanhq.co/docs/v2/',
    fields: [
      { key: 'client_id', label: 'Dhan Client ID', type: 'text', placeholder: 'e.g. 1000000000' },
      { key: 'access_token', label: 'DhanHQ Access Token (JWT)', type: 'password', placeholder: 'Paste permanent/temporary token' },
    ],
  },
  {
    id: 'fyers',
    name: 'FYERS',
    tagline: 'FYERS API v3 Integration',
    docsUrl: 'https://myapi.fyers.in/docsv3',
    fields: [
      { key: 'app_id', label: 'App ID', type: 'text', placeholder: 'e.g. XC12345-100' },
      { key: 'access_token', label: 'Access Token', type: 'password', placeholder: 'Paste daily access token' },
    ],
  },
  {
    id: 'kotak',
    name: 'Kotak Neo',
    tagline: 'Trade API v2 Integration',
    docsUrl: 'https://www.kotaksecurities.com/trade-api/',
    fields: [
      { key: 'consumer_key', label: 'Consumer Key', type: 'text', placeholder: 'Enter Consumer Key' },
      { key: 'consumer_secret', label: 'Consumer Secret', type: 'password', placeholder: 'Enter Consumer Secret' },
      { key: 'access_token', label: 'Session / Access Token', type: 'password', placeholder: 'Enter Session Token' },
    ],
  },
]

export default function Settings() {
  const [activeBroker, setActiveBroker] = useState('dhan')
  const [credentials, setCredentials] = useState({
    client_id: '',
    access_token: '',
    app_id: '',
    consumer_key: '',
    consumer_secret: '',
  })
  const [brokerStatus, setBrokerStatus] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectMsg, setConnectMsg] = useState(null)

  // Preferences
  const [deltaMin, setDeltaMin] = useState(0.07)
  const [deltaMax, setDeltaMax] = useState(0.15)
  const [stopLossRule, setStopLossRule] = useState('1:2')
  const [paperTrading, setPaperTrading] = useState(true)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [prefMsg, setPrefMsg] = useState(null)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const status = await api.getBrokerStatus()
      setBrokerStatus(status)
      if (status.broker) {
        setActiveBroker(status.broker)
      }

      const prefs = await api.getSettings()
      if (prefs) {
        setDeltaMin(prefs.delta_min || 0.07)
        setDeltaMax(prefs.delta_max || 0.15)
        setStopLossRule(prefs.stop_loss_rule || '1:2')
        setPaperTrading(prefs.paper_trading ?? true)
      }
    } catch (err) {
      console.error('Failed to load settings:', err)
    }
  }

  async function handleConnectBroker(e) {
    e.preventDefault()
    setConnecting(true)
    setConnectMsg(null)
    try {
      const res = await api.connectBroker({
        broker: activeBroker,
        ...credentials,
      })
      setConnectMsg({ type: 'success', text: `Successfully connected to ${activeBroker.toUpperCase()}!` })
      await loadSettings()
    } catch (err) {
      setConnectMsg({ type: 'error', text: err.response?.data?.detail || err.message })
    } finally {
      setConnecting(false)
    }
  }

  async function handleSavePrefs(e) {
    e.preventDefault()
    setSavingPrefs(true)
    setPrefMsg(null)
    try {
      await api.updateSettings({
        delta_min: parseFloat(deltaMin),
        delta_max: parseFloat(deltaMax),
        stop_loss_rule: stopLossRule,
        paper_trading: paperTrading,
      })
      setPrefMsg({ type: 'success', text: 'Trading preferences saved!' })
    } catch (err) {
      setPrefMsg({ type: 'error', text: err.message })
    } finally {
      setSavingPrefs(false)
    }
  }

  const selectedBrokerConfig = BROKERS.find(b => b.id === activeBroker)

  return (
    <div className="p-3.5 sm:p-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Broker API & Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
          Connect your broker credentials for live data/trading, configure DSRD delta ranges and stop-loss rules
        </p>
      </div>

      {/* Broker Integration Card */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 sm:p-6 shadow-md space-y-4 sm:space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--color-border)] pb-4">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-[var(--color-primary)]" />
              Multi-Broker Connection
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your broker to pull live option chains and place orders
            </p>
          </div>

          <span
            className={clsx(
              'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5',
              brokerStatus?.connected
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            )}
          >
            <span className={clsx('w-2 h-2 rounded-full', brokerStatus?.connected ? 'bg-emerald-400' : 'bg-amber-400')} />
            {brokerStatus?.connected ? `${brokerStatus.broker?.toUpperCase()} Connected` : 'Paper Mode Active'}
          </span>
        </div>

        {/* Broker Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          {BROKERS.map(b => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setActiveBroker(b.id)
                setConnectMsg(null)
              }}
              className={clsx(
                'p-3 sm:p-3.5 rounded-xl border text-left transition-all',
                activeBroker === b.id
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-sm'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-dark)]/60 hover:bg-slate-800/40'
              )}
            >
              <div className="font-bold text-sm text-white">{b.name}</div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{b.tagline}</div>
            </button>
          ))}
        </div>

        {/* Broker Credentials Form */}
        <form onSubmit={handleConnectBroker} className="space-y-4 pt-2">
          {selectedBrokerConfig.fields.map(field => (
            <div key={field.key} className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 block">{field.label}</label>
              <input
                type={field.type}
                placeholder={field.placeholder}
                value={credentials[field.key] || ''}
                onChange={e => setCredentials({ ...credentials, [field.key]: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg text-sm text-white focus:outline-none focus:border-[var(--color-primary)] transition-colors"
              />
            </div>
          ))}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <a
              href={selectedBrokerConfig.docsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--color-primary)] hover:underline flex items-center gap-1"
            >
              <span>How to generate {selectedBrokerConfig.name} API credentials</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="submit"
              disabled={connecting}
              className="w-full sm:w-auto px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Key className="w-4 h-4" />
              <span>{connecting ? 'Validating...' : `Connect ${selectedBrokerConfig.name}`}</span>
            </button>
          </div>

          {connectMsg && (
            <div
              className={clsx(
                'p-3 rounded-lg text-xs font-semibold',
                connectMsg.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
              )}
            >
              {connectMsg.text}
            </div>
          )}
        </form>
      </div>

      {/* DSRD Framework Preferences Card */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-4 sm:p-6 shadow-md space-y-4 sm:space-y-5">
        <div className="border-b border-[var(--color-border)] pb-4">
          <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[var(--color-primary)]" />
            DSRD Trading Preferences
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure default Delta boundaries and Stop-Loss safety rules
          </p>
        </div>

        <form onSubmit={handleSavePrefs} className="space-y-5">
          {/* Delta Range */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label className="font-semibold text-slate-300">
                Golden Delta Range (Sanjay Kathuria's Rule: 0.07 to 0.15)
              </label>
              <span className="text-[var(--color-primary)] font-mono font-bold">
                {deltaMin} – {deltaMax} ({(100 - deltaMax * 100).toFixed(0)}% – {(100 - deltaMin * 100).toFixed(0)}% Win Prob)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[11px] text-slate-400 mb-1 block">Minimum Delta (Furthest Strike)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.02"
                  max="0.25"
                  value={deltaMin}
                  onChange={e => setDeltaMin(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 mb-1 block">Maximum Delta (Closest Strike)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.05"
                  max="0.30"
                  value={deltaMax}
                  onChange={e => setDeltaMax(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg text-sm text-white"
                />
              </div>
            </div>
          </div>

          {/* Stop-Loss Rule */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">Default Stop-Loss Rule</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: '1:1', label: '1:1 Stop Rule', desc: 'Max Loss = 1x Net Credit (Conservative)' },
                { id: '1:2', label: '1:2 Stop Rule', desc: 'Max Loss = 2x Net Credit (Recommended)' },
                { id: '1:3', label: '1:3 Stop Rule', desc: 'Max Loss = 3x Net Credit (Aggressive)' },
              ].map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setStopLossRule(r.id)}
                  className={clsx(
                    'p-3 rounded-xl border text-left transition-all',
                    stopLossRule === r.id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white font-bold'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-dark)] text-slate-400'
                  )}
                >
                  <div className="text-xs font-bold text-white">{r.label}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{r.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Paper Trading Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[var(--color-bg-dark)] rounded-xl border border-[var(--color-border)]">
            <div>
              <div className="text-xs font-bold text-white">Default to Paper Trading</div>
              <div className="text-[11px] text-slate-400">
                Simulate executions without placing real orders on the exchange
              </div>
            </div>
            <input
              type="checkbox"
              checked={paperTrading}
              onChange={e => setPaperTrading(e.target.checked)}
              className="w-5 h-5 accent-[var(--color-primary)] cursor-pointer"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            {prefMsg && (
              <span className="text-xs text-emerald-400 font-semibold">{prefMsg.text}</span>
            )}
            <button
              type="submit"
              disabled={savingPrefs}
              className="w-full sm:w-auto sm:ml-auto px-6 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>{savingPrefs ? 'Saving...' : 'Save Preferences'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
