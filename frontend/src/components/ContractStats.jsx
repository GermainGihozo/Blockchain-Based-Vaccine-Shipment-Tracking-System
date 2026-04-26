import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'
import { Package, Activity, CheckCircle, Hash } from 'lucide-react'

export default function ContractStats({ refreshTrigger }) {
  const { data: stats, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getContractStats',
    query: { refetchInterval: 5_000, staleTime: 3_000 },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-3 bg-slate-800 rounded w-2/3 mb-3" />
            <div className="h-8 bg-slate-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card border-red-500/30 bg-red-950/30 text-red-400 text-sm">
        ⚠ Could not load contract stats — is the Hardhat node running?
      </div>
    )
  }

  const total     = stats ? Number(stats[0]) : 0
  const active    = stats ? Number(stats[1]) : 0
  const nextId    = stats ? Number(stats[2]) : 1
  const completed = total - active

  const cards = [
    {
      label: 'Total Shipments',
      value: total,
      icon: Package,
      accent: 'text-cyan-400',
      glow: 'shadow-cyan-500/10',
      border: 'border-cyan-500/20',
    },
    {
      label: 'Active',
      value: active,
      icon: Activity,
      accent: 'text-emerald-400',
      glow: 'shadow-emerald-500/10',
      border: 'border-emerald-500/20',
    },
    {
      label: 'Completed',
      value: completed,
      icon: CheckCircle,
      accent: 'text-purple-400',
      glow: 'shadow-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Next ID',
      value: nextId,
      icon: Hash,
      accent: 'text-slate-400',
      glow: '',
      border: 'border-slate-700',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, accent, glow, border }) => (
        <div key={label} className={`stat-card shadow-lg ${glow} border ${border}`}>
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">{label}</p>
            <Icon className={`w-4 h-4 ${accent} opacity-60`} />
          </div>
          <p className={`text-3xl font-bold mt-2 ${accent}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}
