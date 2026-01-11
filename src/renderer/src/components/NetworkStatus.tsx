import React, { useState, useEffect } from 'react'
import { errorService } from '../services/ErrorService'
import './NetworkStatus.css'

interface NetworkStatusProps {
  onStatusChange?: (isOnline: boolean) => void
  showIndicator?: boolean
  className?: string
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({
  onStatusChange,
  showIndicator = true,
  className = ''
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [wasOffline, setWasOffline] = useState(false)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      onStatusChange?.(true)
      
      if (wasOffline) {
        setShowReconnected(true)
        setTimeout(() => setShowReconnected(false), 3000)
        setWasOffline(false)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      setWasOffline(true)
      onStatusChange?.(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check connectivity on mount
    errorService.checkNetworkConnectivity().then(connected => {
      if (connected !== isOnline) {
        setIsOnline(connected)
        onStatusChange?.(connected)
      }
    })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [onStatusChange, wasOffline, isOnline])

  if (!showIndicator) {
    return null
  }

  return (
    <>
      {!isOnline && (
        <div className={`network-status offline ${className}`}>
          <div className="status-content">
            <span className="status-icon">⚠️</span>
            <span className="status-text">No internet connection</span>
            <button 
              className="retry-connection"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      )}
      
      {showReconnected && (
        <div className={`network-status reconnected ${className}`}>
          <div className="status-content">
            <span className="status-icon">✅</span>
            <span className="status-text">Connection restored</span>
          </div>
        </div>
      )}
    </>
  )
}

interface ConnectionQualityProps {
  className?: string
}

export const ConnectionQuality: React.FC<ConnectionQualityProps> = ({
  className = ''
}) => {
  const [quality, setQuality] = useState<'good' | 'fair' | 'poor' | 'offline'>('good')
  const [latency, setLatency] = useState<number | null>(null)

  useEffect(() => {
    const checkConnectionQuality = async () => {
      try {
        const startTime = performance.now()
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-cache'
        })
        const endTime = performance.now()
        const responseTime = endTime - startTime

        setLatency(Math.round(responseTime))

        if (responseTime < 200) {
          setQuality('good')
        } else if (responseTime < 500) {
          setQuality('fair')
        } else {
          setQuality('poor')
        }
      } catch {
        setQuality('offline')
        setLatency(null)
      }
    }

    checkConnectionQuality()
    const interval = setInterval(checkConnectionQuality, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [])

  const getQualityIcon = () => {
    switch (quality) {
      case 'good': return '📶'
      case 'fair': return '📶'
      case 'poor': return '📶'
      case 'offline': return '❌'
      default: return '📶'
    }
  }

  const getQualityText = () => {
    switch (quality) {
      case 'good': return 'Good connection'
      case 'fair': return 'Fair connection'
      case 'poor': return 'Slow connection'
      case 'offline': return 'No connection'
      default: return 'Unknown'
    }
  }

  return (
    <div className={`connection-quality ${quality} ${className}`}>
      <span className="quality-icon">{getQualityIcon()}</span>
      <span className="quality-text">{getQualityText()}</span>
      {latency && (
        <span className="latency">{latency}ms</span>
      )}
    </div>
  )
}

// Hook for using network status in components
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'fair' | 'poor' | 'offline'>('good')

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkConnectivity = async () => {
    return await errorService.checkNetworkConnectivity()
  }

  return {
    isOnline,
    connectionQuality,
    checkConnectivity
  }
}