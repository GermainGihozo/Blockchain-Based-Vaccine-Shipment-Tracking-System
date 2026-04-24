import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import Dashboard from './components/Dashboard'
import TemperatureAlertOverlay from './components/TemperatureAlertOverlay'
import { useTemperatureAlerts } from './hooks/useTemperatureAlerts'

function App() {
  const { isConnected } = useAccount()
  const { alerts, dismissAlert } = useTemperatureAlerts()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Temperature Alert Overlay */}
      {alerts.length > 0 && (
        <TemperatureAlertOverlay 
          alerts={alerts} 
          onDismiss={dismissAlert}
        />
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  🧬 Vaccine Shipment Tracker
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isConnected ? (
          <Dashboard />
        ) : (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <div className="mb-8">
                <div className="text-6xl mb-4">🔗</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Connect Your Wallet
                </h2>
                <p className="text-gray-600">
                  Connect your wallet to access the vaccine shipment tracking dashboard
                </p>
              </div>
              <ConnectButton />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Vaccine Shipment Tracker - Ensuring Cold Chain Integrity</p>
            <p className="mt-1">Built with React, Wagmi, and Hardhat</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App