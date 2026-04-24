import { useState, useEffect } from 'react'
import { useReadContract } from 'wagmi'
import { Package, Thermometer, MapPin, Clock } from 'lucide-react'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'

function ShipmentList({ limit, refreshTrigger }) {
  const [shipments, setShipments] = useState([])
  const [loading, setLoading] = useState(true)

  // Get contract stats to know how many shipments exist
  const { data: stats } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getContractStats',
  })

  // Fetch individual shipments
  useEffect(() => {
    const fetchShipments = async () => {
      if (!stats) return

      setLoading(true)
      const totalShipments = Number(stats[0])
      const shipmentsToFetch = limit ? Math.min(limit, totalShipments) : totalShipments
      
      const shipmentPromises = []
      for (let i = 1; i <= shipmentsToFetch; i++) {
        shipmentPromises.push(
          // This would be replaced with actual contract calls
          fetch(`/api/shipments/${i}`).catch(() => null)
        )
      }

      try {
        const results = await Promise.all(shipmentPromises)
        const validShipments = results.filter(Boolean)
        setShipments(validShipments)
      } catch (error) {
        console.error('Error fetching shipments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchShipments()
  }, [stats, limit, refreshTrigger])

  const getStatusBadge = (status) => {
    const statusMap = {
      0: { label: 'Created', className: 'status-created' },
      1: { label: 'In Transit', className: 'status-in-transit' },
      2: { label: 'Temperature Breach', className: 'status-temperature-breach' },
      3: { label: 'Delivered', className: 'status-delivered' },
      4: { label: 'Reverted', className: 'status-reverted' },
    }
    
    const statusInfo = statusMap[status] || { label: 'Unknown', className: 'status-created' }
    return (
      <span className={statusInfo.className}>
        {statusInfo.label}
      </span>
    )
  }

  const formatTemperature = (temp) => {
    return (temp / 100).toFixed(1) + '°C'
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 rounded-lg p-4">
              <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (shipments.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>No shipments found</p>
        <p className="text-sm">Create your first shipment to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {shipments.map((shipment) => (
        <div key={shipment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-semibold text-gray-900">
                Shipment #{shipment.id}
              </h4>
              <p className="text-sm text-gray-600">
                Batch: {shipment.batchNumber}
              </p>
            </div>
            {getStatusBadge(shipment.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Thermometer className="w-4 h-4 text-blue-500" />
              <span>
                {shipment.currentTemperature !== 0 
                  ? formatTemperature(shipment.currentTemperature)
                  : 'No data'
                }
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-green-500" />
              <span className="truncate">{shipment.location || 'Unknown'}</span>
            </div>

            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span>{formatTimestamp(shipment.lastUpdate)}</span>
            </div>
          </div>

          {shipment.status === 2 && ( // Temperature Breach
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                ⚠️ Temperature breach detected! Shipment automatically reverted for safety.
              </p>
            </div>
          )}
        </div>
      ))}

      {limit && shipments.length >= limit && (
        <div className="text-center pt-4">
          <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all shipments →
          </button>
        </div>
      )}
    </div>
  )
}

export default ShipmentList