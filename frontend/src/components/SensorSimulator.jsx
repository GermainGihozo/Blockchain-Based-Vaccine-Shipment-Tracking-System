import { useState, useEffect, useRef } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS, CONTRACT_ABI, MIN_SAFE_TEMPERATURE, MAX_SAFE_TEMPERATURE } from '../config/contract'
import {
  Thermometer, Zap, MapPin, AlertTriangle,
  CheckCircle, Loader2, Play, Square, RefreshCw,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'

const LOCATIONS = [
  'Cold Storage A', 'Cold Storage B', 'Transit Hub – JFK',
  'Transit Hub – LAX', 'Distribution Center', 'Last-Mile Van #7',
  'Airport Cargo Bay', 'Refrigerated Truck #12', 'Pharmacy Depot',
]

// Safe range in display °C
const DISPLAY_MIN = -85
const DISPLAY_MAX = 15

function tempToContract(c) { return Math.round(c * 100) }
function contractToDisplay(raw) { return Number(raw) / 100 }

function tempColor(c) {
  if (c < -80 || c > 8) return 'text-red-400'
  if (c < -70 || c > 6) return 'text-yellow-400'
  return 'text-emerald-400'
}

function gaugePercent(c) {
  return Math.max(0, Math.min(100, ((c - DISPLAY_MIN) / (DISPLAY_MAX - DISPLAY_MIN)) * 100))
}

function gaugeColor(c) {
  if (c < -80 || c > 8) return 'bg-red-500'
  if (c < -70 || c > 6) return 'bg-yellow-400'
  return 'bg-emerald-400'
}

export default function SensorSimulator({ onUpdate }) {
  const [shipmentId, setShipmentId] = useState('1')
  const [temperature, setTemperature] = useState(-5)
  const [location, setLocation] = useState(LOCATIONS[0])
  const [customLocation, setCustomLocation] = useState('')
  const [useCustomLoc, setUseCustomLoc] = useState(false)
  const [history, setHistory] = useState([])
  const [autoMode, setAutoMode] = useState(false)
  const autoRef = useRef(null)

  const { writeContract, data: hash, error, isPending, reset } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Read current shipment to show live data
  const { data: shipmentData, refetch: refetchShipment } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getShipment',
    args: [BigInt(shipmentId || 1)],
    query: { enabled: !!shipmentId && Number(shipmentId) > 0 },
  })

  // On success: log to history, notify parent, refetch
  useEffect(() => {
    if (!isSuccess) return
    const loc = useCustomLoc ? customLocation : location
    setHistory(prev => [
      {
        id: Date.now(),
        temp: temperature,
        loc,
        time: new Date().toLocaleTimeString(),
        breach: temperature < -80 || temperature > 8,
      },
      ...prev.slice(0, 19),
    ])
    onUpdate?.()
    refetchShipment()
    reset()
  }, [isSuccess]) // eslint-disable-line

  // Auto-mode: send a reading every 4 s with slight random drift
  useEffect(() => {
    if (!autoMode) { clearInterval(autoRef.current); return }
    autoRef.current = setInterval(() => {
      setTemperature(prev => {
        const drift = (Math.random() - 0.5) * 2
        return Math.max(DISPLAY_MIN, Math.min(DISPLAY_MAX, parseFloat((prev + drift).toFixed(1))))
      })
    }, 1500)
    return () => clearInterval(autoRef.current)
  }, [autoMode])

  // Auto-submit when temperature changes in auto mode
  const prevAutoTemp = useRef(temperature)
  useEffect(() => {
    if (!autoMode || isPending || isConfirming) return
    if (Math.abs(temperature - prevAutoTemp.current) < 0.5) return
    prevAutoTemp.current = temperature
    sendReading()
  }, [temperature, autoMode]) // eslint-disable-line

  const sendReading = () => {
    if (!shipmentId || isPending || isConfirming) return
    const loc = useCustomLoc ? customLocation.trim() || 'Unknown' : location
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'updateStatus',
      args: [BigInt(shipmentId), BigInt(tempToContract(temperature)), loc],
    })
  }

  const isBreach = temperature < -80 || temperature > 8
  const busy = isPending || isConfirming
  const currentLoc = useCustomLoc ? customLocation : location

  const currentOnChain = shipmentData
    ? contractToDisplay(shipmentData.currentTemperature)
    : null

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Sensor Simulator</h3>
          <p className="text-sm text-slate-400">
            Simulate IoT temperature readings without a physical device
          </p>
        </div>
        <button
          onClick={() => setAutoMode(a => !a)}
          className={autoMode ? 'btn-danger' : 'btn-ghost'}
        >
          {autoMode ? <><Square className="w-4 h-4" /> Stop Auto</> : <><Play className="w-4 h-4" /> Auto Mode</>}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Left: Controls ── */}
        <div className="card space-y-6">

          {/* Shipment ID */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Shipment ID
            </label>
            <input
              type="number"
              min="1"
              value={shipmentId}
              onChange={e => setShipmentId(e.target.value)}
              className="input w-32"
              placeholder="1"
            />
            {shipmentData && (
              <p className="mt-1 text-xs text-slate-500">
                Batch: <span className="text-cyan-400">{shipmentData.batchNumber}</span>
                &nbsp;·&nbsp;
                Status: <span className="text-cyan-400">
                  {['Created','In Transit','Breach','Delivered','Reverted'][Number(shipmentData.status)] ?? '?'}
                </span>
              </p>
            )}
          </div>

          {/* Temperature slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Temperature
              </label>
              <span className={`text-2xl font-bold font-mono tabular-nums ${tempColor(temperature)}`}>
                {temperature > 0 ? '+' : ''}{temperature.toFixed(1)} °C
              </span>
            </div>

            {/* Gauge */}
            <div className="gauge-track mb-3 relative">
              {/* Safe zone marker */}
              <div
                className="absolute top-0 h-full bg-emerald-500/20 border-x border-emerald-500/40"
                style={{
                  left: `${gaugePercent(-80)}%`,
                  width: `${gaugePercent(8) - gaugePercent(-80)}%`,
                }}
              />
              <div
                className={`gauge-fill ${gaugeColor(temperature)}`}
                style={{ width: `${gaugePercent(temperature)}%` }}
              />
            </div>

            <input
              type="range"
              min={DISPLAY_MIN}
              max={DISPLAY_MAX}
              step="0.1"
              value={temperature}
              onChange={e => setTemperature(parseFloat(e.target.value))}
              className="w-full"
              disabled={autoMode}
            />

            <div className="flex justify-between text-xs text-slate-600 mt-1">
              <span>{DISPLAY_MIN} °C</span>
              <span className="text-emerald-600">Safe: −80 to +8 °C</span>
              <span>{DISPLAY_MAX} °C</span>
            </div>

            {/* Quick presets */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { label: '−70 °C', val: -70, safe: true  },
                { label: '−5 °C',  val: -5,  safe: true  },
                { label: '+4 °C',  val: 4,   safe: true  },
                { label: '+10 °C', val: 10,  safe: false },
                { label: '−85 °C', val: -85, safe: false },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => setTemperature(p.val)}
                  disabled={autoMode}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 ${
                    p.safe
                      ? 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-800/60'
                      : 'bg-red-900/50 text-red-300 hover:bg-red-800/60'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
              Location
            </label>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setUseCustomLoc(false)}
                className={`text-xs px-3 py-1 rounded-lg ${!useCustomLoc ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
              >
                Preset
              </button>
              <button
                onClick={() => setUseCustomLoc(true)}
                className={`text-xs px-3 py-1 rounded-lg ${useCustomLoc ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}
              >
                Custom
              </button>
            </div>
            {useCustomLoc ? (
              <input
                type="text"
                value={customLocation}
                onChange={e => setCustomLocation(e.target.value)}
                placeholder="e.g., Warehouse B – Dock 3"
                className="input"
              />
            ) : (
              <select
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="input"
              >
                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            )}
          </div>

          {/* Breach warning */}
          {isBreach && (
            <div className="flex items-start gap-3 p-4 bg-red-950/60 border border-red-500/40 rounded-xl animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Temperature Breach</p>
                <p className="text-xs text-red-400/80 mt-0.5">
                  Sending this reading will trigger an on-chain alert and automatically revert the shipment.
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-500/30 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error.shortMessage || error.message}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={sendReading}
            disabled={busy || autoMode || !shipmentId}
            className={`w-full ${isBreach ? 'btn-danger' : 'btn-primary'}`}
          >
            {busy ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{isConfirming ? 'Confirming…' : 'Sending…'}</>
            ) : (
              <><Zap className="w-4 h-4" />Send Reading to Chain</>
            )}
          </button>

          {autoMode && (
            <p className="text-center text-xs text-cyan-400 animate-pulse">
              ⚡ Auto mode active — readings sent automatically
            </p>
          )}
        </div>

        {/* ── Right: Live display + history ── */}
        <div className="space-y-4">

          {/* Live thermometer card */}
          <div className="card text-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              Simulated Reading
            </p>

            {/* Big thermometer visual */}
            <div className="relative inline-flex flex-col items-center mb-4">
              <div className="w-12 h-40 bg-slate-800 rounded-full border border-slate-700 relative overflow-hidden flex flex-col justify-end">
                <div
                  className={`w-full rounded-full transition-all duration-700 ${gaugeColor(temperature)}`}
                  style={{ height: `${gaugePercent(temperature)}%` }}
                />
              </div>
              <div className={`w-8 h-8 rounded-full border-4 border-slate-700 mt-1 ${gaugeColor(temperature)}`} />
              <Thermometer className="absolute top-2 text-slate-600 w-5 h-5" />
            </div>

            <p className={`text-4xl font-bold font-mono tabular-nums ${tempColor(temperature)}`}>
              {temperature > 0 ? '+' : ''}{temperature.toFixed(1)} °C
            </p>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <MapPin className="w-3 h-3" /> {currentLoc}
            </p>

            {isBreach ? (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-red-900/50 border border-red-500/40 rounded-full text-xs text-red-300 font-semibold">
                <AlertTriangle className="w-3 h-3" /> BREACH
              </div>
            ) : (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-900/50 border border-emerald-500/40 rounded-full text-xs text-emerald-300 font-semibold">
                <CheckCircle className="w-3 h-3" /> SAFE
              </div>
            )}

            {/* On-chain comparison */}
            {currentOnChain !== null && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-center gap-3 text-xs text-slate-500">
                <span>On-chain: <span className={`font-semibold ${tempColor(currentOnChain)}`}>{currentOnChain.toFixed(1)} °C</span></span>
                {temperature > currentOnChain + 0.5 && <TrendingUp className="w-3 h-3 text-red-400" />}
                {temperature < currentOnChain - 0.5 && <TrendingDown className="w-3 h-3 text-blue-400" />}
                {Math.abs(temperature - currentOnChain) <= 0.5 && <Minus className="w-3 h-3 text-slate-500" />}
              </div>
            )}
          </div>

          {/* Reading history */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Reading History
              </p>
              {history.length > 0 && (
                <button onClick={() => setHistory([])} className="text-xs text-slate-600 hover:text-slate-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-6">
                No readings sent yet — use the controls to send your first reading
              </p>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {history.map(h => (
                  <div
                    key={h.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
                      h.breach
                        ? 'bg-red-950/50 border border-red-500/20'
                        : 'bg-slate-800/60 border border-slate-700/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {h.breach
                        ? <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                        : <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                      }
                      <span className={`font-mono font-semibold ${h.breach ? 'text-red-300' : 'text-emerald-300'}`}>
                        {h.temp > 0 ? '+' : ''}{h.temp.toFixed(1)} °C
                      </span>
                      <span className="text-slate-500 truncate max-w-[100px]">{h.loc}</span>
                    </div>
                    <span className="text-slate-600 shrink-0">{h.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
