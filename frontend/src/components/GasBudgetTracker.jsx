import { useBalance, useAccount } from 'wagmi'
import { Wallet, TrendingUp, AlertCircle } from 'lucide-react'

function GasBudgetTracker({ detailed = false }) {
  const { address } = useAccount()
  
  // Get ETH balance for the connected account
  const { data: balance, isLoading } = useBalance({
    address: address,
  })

  // Mock tracker addresses for demonstration
  const trackerAddresses = [
    '0x742d35Cc6634C0532925a3b8D4C9db96590c6C87',
    '0x8ba1f109551bD432803012645Hac136c9c1659e',
    '0x2546BcD3c84621e976D8185a91A922aE77ECEc30'
  ]

  const formatBalance = (balance) => {
    if (!balance) return '0.0000'
    return parseFloat(balance.formatted).toFixed(4)
  }

  const getBalanceStatus = (balance) => {
    if (!balance) return 'unknown'
    const eth = parseFloat(balance.formatted)
    if (eth < 0.01) return 'critical'
    if (eth < 0.05) return 'warning'
    return 'good'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
      </div>
    )
  }

  const status = getBalanceStatus(balance)

  return (
    <div className="space-y-4">
      {/* Main Account Balance */}
      <div className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5" />
            <span className="font-medium">Main Account</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {formatBalance(balance)} ETH
            </div>
            <div className="text-xs opacity-75">
              ${balance ? (parseFloat(balance.formatted) * 2000).toFixed(2) : '0.00'} USD
            </div>
          </div>
        </div>
        
        {status === 'critical' && (
          <div className="mt-2 flex items-center space-x-1 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Critical: Low gas budget</span>
          </div>
        )}
        
        {status === 'warning' && (
          <div className="mt-2 flex items-center space-x-1 text-xs">
            <AlertCircle className="w-3 h-3" />
            <span>Warning: Gas budget running low</span>
          </div>
        )}
      </div>

      {detailed && (
        <>
          {/* Tracker Wallets */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Automated Tracker Wallets
            </h4>
            <div className="space-y-2">
              {trackerAddresses.map((address, index) => (
                <TrackerWalletBalance key={address} address={address} index={index} />
              ))}
            </div>
          </div>

          {/* Gas Usage Statistics */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" />
              <span>Gas Usage Statistics</span>
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Today</div>
                <div className="font-semibold">0.0023 ETH</div>
              </div>
              <div>
                <div className="text-gray-600">This Week</div>
                <div className="font-semibold">0.0156 ETH</div>
              </div>
              <div>
                <div className="text-gray-600">Avg per Update</div>
                <div className="font-semibold">0.0001 ETH</div>
              </div>
              <div>
                <div className="text-gray-600">Total Updates</div>
                <div className="font-semibold">234</div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              💡 Recommendations
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Maintain at least 0.05 ETH for continuous operations</li>
              <li>• Set up automatic top-ups for tracker wallets</li>
              <li>• Monitor gas prices during high network activity</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function TrackerWalletBalance({ address, index }) {
  const { data: balance, isLoading } = useBalance({
    address: address,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-1/3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      </div>
    )
  }

  const status = balance ? (parseFloat(balance.formatted) < 0.01 ? 'low' : 'good') : 'unknown'

  return (
    <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${status === 'good' ? 'bg-green-400' : 'bg-red-400'}`}></div>
        <span className="font-mono text-xs">
          Tracker {index + 1}: {address.slice(0, 6)}...{address.slice(-4)}
        </span>
      </div>
      <div className="font-medium">
        {balance ? parseFloat(balance.formatted).toFixed(4) : '0.0000'} ETH
      </div>
    </div>
  )
}

export default GasBudgetTracker