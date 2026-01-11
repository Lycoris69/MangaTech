import React, { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import './NotificationSystem.css'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
  primary?: boolean
}

interface NotificationItemProps {
  notification: Notification
  onDismiss: (id: string) => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!notification.persistent && notification.duration !== 0) {
      const duration = notification.duration || 5000
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [notification.duration, notification.persistent])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(notification.id)
    }, 300)
  }

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅'
      case 'error': return '❌'
      case 'warning': return '⚠️'
      case 'info': return 'ℹ️'
      default: return 'ℹ️'
    }
  }

  return (
    <div 
      className={`notification ${notification.type} ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}
    >
      <div className="notification-content">
        <div className="notification-header">
          <span className="notification-icon">{getIcon()}</span>
          <h4 className="notification-title">{notification.title}</h4>
          <button 
            className="notification-close"
            onClick={handleDismiss}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
        
        {notification.message && (
          <p className="notification-message">{notification.message}</p>
        )}
        
        {notification.actions && notification.actions.length > 0 && (
          <div className="notification-actions">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                className={`notification-action ${action.primary ? 'primary' : 'secondary'}`}
                onClick={() => {
                  action.action()
                  if (!notification.persistent) {
                    handleDismiss()
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface NotificationSystemProps {
  maxNotifications?: number
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxNotifications = 5
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newNotification: Notification = {
      ...notification,
      id
    }

    setNotifications(prev => {
      const updated = [newNotification, ...prev]
      return updated.slice(0, maxNotifications)
    })

    return id
  }, [maxNotifications])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  // Expose methods globally for easy access
  useEffect(() => {
    window.notificationSystem = {
      addNotification,
      removeNotification,
      clearAll,
      success: (title: string, message?: string, options?: Partial<Notification>) =>
        addNotification({ type: 'success', title, message, ...options }),
      error: (title: string, message?: string, options?: Partial<Notification>) =>
        addNotification({ type: 'error', title, message, persistent: true, ...options }),
      warning: (title: string, message?: string, options?: Partial<Notification>) =>
        addNotification({ type: 'warning', title, message, ...options }),
      info: (title: string, message?: string, options?: Partial<Notification>) =>
        addNotification({ type: 'info', title, message, ...options })
    }

    return () => {
      delete window.notificationSystem
    }
  }, [addNotification, removeNotification, clearAll])

  if (notifications.length === 0) {
    return null
  }

  return createPortal(
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={removeNotification}
        />
      ))}
      
      {notifications.length > 1 && (
        <button 
          className="clear-all-notifications"
          onClick={clearAll}
        >
          Clear All ({notifications.length})
        </button>
      )}
    </div>,
    document.body
  )
}

// Hook for using notifications in components
export const useNotifications = () => {
  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    return window.notificationSystem?.addNotification(notification)
  }, [])

  const success = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return window.notificationSystem?.success(title, message, options)
  }, [])

  const error = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return window.notificationSystem?.error(title, message, options)
  }, [])

  const warning = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return window.notificationSystem?.warning(title, message, options)
  }, [])

  const info = useCallback((title: string, message?: string, options?: Partial<Notification>) => {
    return window.notificationSystem?.info(title, message, options)
  }, [])

  const clearAll = useCallback(() => {
    window.notificationSystem?.clearAll()
  }, [])

  return {
    addNotification,
    success,
    error,
    warning,
    info,
    clearAll
  }
}

// Extend window interface for TypeScript
declare global {
  interface Window {
    notificationSystem?: {
      addNotification: (notification: Omit<Notification, 'id'>) => string
      removeNotification: (id: string) => void
      clearAll: () => void
      success: (title: string, message?: string, options?: Partial<Notification>) => string
      error: (title: string, message?: string, options?: Partial<Notification>) => string
      warning: (title: string, message?: string, options?: Partial<Notification>) => string
      info: (title: string, message?: string, options?: Partial<Notification>) => string
    }
  }
}