import { useState } from 'react'
import { useAccount } from 'wagmi'
import ContractStats from './ContractStats'
import ShipmentList from './ShipmentList'
import CreateShipment from './CreateShipment'
import SensorSimulator from './SensorSimulator'
import GasBudgetTracker from './GasBudgetTracker'
import {
  LayoutDashboard, Package, PlusCircle,
  Thermometer, Wallet, ChevronRight,
} from 'lucide-react'

const TABS = [
  { id: 'overview',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'shipments',  label: 'Shipments',   icon: Package         },
  { id: 'create',     label: 'New Shipment',icon: PlusCircle      },
  { id: 'simulator',  label: 'Sensor Sim',  icon: Thermometer     },
  { id: 'gas',        label: 'Gas Budget',  icon: Wallet          },
]

export default function Dashboard() {
  const { address } = useAccount()
  const [tab, setTab] = useState('overview')
  const [refresh, setRefresh] = useState(0)

  const bump = () => setRefresh(r => r + 1)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Hero banner ── */}
      <div
        className="relative overflow-hidden rounded-2xl border border-cyan-500/20 p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(8,145,178,0.15) 0%, rgb(15,23,42) 60%)',
        }}
      >
        {/* Subtle grid overlay via inline SVG — not a Tailwind utility so it won't be purged */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2306b6d4' fill-opacity='0.3'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-1">
              Live Dashboard
            </p>
            <h2 className="text-2xl font-bold text-white">Vaccine Shipment Tracker</h2>
            <p className="text-slate-400 text-sm mt-1">
              Monitor cold-chain integrity in real-time
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500 mb-1">Connected wallet</p>
            <p className="font-mono text-xs text-cyan-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Tab nav ── */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
              tab === id
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="animate-slide-up" key={tab}>

        {tab === 'overview' && (
          <div className="space-y-6">
            <ContractStats refreshTrigger={refresh} />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-3 card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">Recent Shipments</h3>
                  <button
                    onClick={() => setTab('shipments')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <ShipmentList limit={4} refreshTrigger={refresh} />
              </div>
              <div className="lg:col-span-2 space-y-4">
                <div className="card">
                  <h3 className="font-semibold text-white mb-4">Gas Budget</h3>
                  <GasBudgetTracker />
                </div>
                <div className="card bg-gradient-to-br from-cyan-500/10 to-slate-900 border-cyan-500/20">
                  <p className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-2">
                    Quick Action
                  </p>
                  <p className="text-sm text-slate-300 mb-3">
                    Simulate a sensor reading to test temperature alerts
                  </p>
                  <button
                    onClick={() => setTab('simulator')}
                    className="btn-primary w-full"
                  >
                    <Thermometer className="w-4 h-4" />
                    Open Sensor Simulator
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'shipments' && (
          <div className="card">
            <h3 className="font-semibold text-white mb-5">All Shipments</h3>
            <ShipmentList refreshTrigger={refresh} />
          </div>
        )}

        {tab === 'create' && (
          <div className="max-w-xl">
            <div className="card">
              <h3 className="font-semibold text-white mb-1">Create New Shipment</h3>
              <p className="text-sm text-slate-400 mb-6">
                Register a new vaccine batch on-chain with a tracker device
              </p>
              <CreateShipment onShipmentCreated={bump} />
            </div>
          </div>
        )}

        {tab === 'simulator' && (
          <SensorSimulator onUpdate={bump} />
        )}

        {tab === 'gas' && (
          <div className="max-w-lg">
            <div className="card">
              <h3 className="font-semibold text-white mb-5">Gas Budget</h3>
              <GasBudgetTracker detailed />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
