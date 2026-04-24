import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'
import { Package, Loader2 } from 'lucide-react'

function CreateShipment({ onShipmentCreated }) {
  const [batchNumber, setBatchNumber] = useState('')
  const [trackerAddress, setTrackerAddress] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { writeContract, data: hash, error } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!batchNumber.trim() || !trackerAddress.trim()) {
      alert('Please fill in all fields')
      return
    }

    setIsSubmitting(true)

    try {
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createShipment',
        args: [batchNumber.trim(), trackerAddress.trim()],
      })
    } catch (err) {
      console.error('Error creating shipment:', err)
      setIsSubmitting(false)
    }
  }

  // Handle successful transaction
  if (isSuccess) {
    setBatchNumber('')
    setTrackerAddress('')
    setIsSubmitting(false)
    onShipmentCreated?.()
  }

  return (
    <div className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="batchNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Batch Number
          </label>
          <input
            type="text"
            id="batchNumber"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="e.g., BATCH-001"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            disabled={isSubmitting || isConfirming}
          />
        </div>

        <div>
          <label htmlFor="trackerAddress" className="block text-sm font-medium text-gray-700 mb-2">
            Tracker Device Address
          </label>
          <input
            type="text"
            id="trackerAddress"
            value={trackerAddress}
            onChange={(e) => setTrackerAddress(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
            disabled={isSubmitting || isConfirming}
          />
          <p className="mt-1 text-xs text-gray-500">
            Ethereum address of the IoT tracker device
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">
              Error: {error.shortMessage || error.message}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isConfirming || !batchNumber.trim() || !trackerAddress.trim()}
          className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {(isSubmitting || isConfirming) ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {isConfirming ? 'Confirming...' : 'Creating...'}
              </span>
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              <span>Create Shipment</span>
            </>
          )}
        </button>

        {isConfirming && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              Transaction submitted. Waiting for confirmation...
            </p>
          </div>
        )}

        {isSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-800">
              ✅ Shipment created successfully!
            </p>
          </div>
        )}
      </form>

      <div className="mt-8 p-4 bg-gray-50 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">
          Temperature Safety Limits
        </h4>
        <div className="text-xs text-gray-600 space-y-1">
          <p>• Minimum: -80°C (Ultra-low freezer)</p>
          <p>• Maximum: 8°C (Refrigerated)</p>
          <p>• Automatic reversion on breach</p>
        </div>
      </div>
    </div>
  )
}

export default CreateShipment