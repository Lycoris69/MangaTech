import React from 'react'
import './LoadingSpinner.css'

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large'
  message?: string
  overlay?: boolean
  className?: string
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message,
  overlay = false,
  className = ''
}) => {
  const spinnerClass = `loading-spinner ${size} ${className}`
  
  const content = (
    <div className={spinnerClass}>
      <div className="spinner-circle">
        <div className="spinner-inner"></div>
      </div>
      {message && <p className="spinner-message">{message}</p>}
    </div>
  )

  if (overlay) {
    return (
      <div className="loading-overlay">
        {content}
      </div>
    )
  }

  return content
}

interface LoadingStateProps {
  loading: boolean
  error?: string | null
  children: React.ReactNode
  loadingMessage?: string
  errorMessage?: string
  onRetry?: () => void
  className?: string
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  error,
  children,
  loadingMessage = 'Loading...',
  errorMessage,
  onRetry,
  className = ''
}) => {
  if (loading) {
    return (
      <div className={`loading-state ${className}`}>
        <LoadingSpinner message={loadingMessage} />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`error-state ${className}`}>
        <div className="error-content">
          <div className="error-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>{errorMessage || error}</p>
          {onRetry && (
            <button onClick={onRetry} className="retry-button">
              Try Again
            </button>
          )}
        </div>
      </div>
    )
  }

  return <>{children}</>
}

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  className = ''
}) => {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
  }

  return <div className={`skeleton ${className}`} style={style} />
}

interface SkeletonCardProps {
  showImage?: boolean
  lines?: number
  className?: string
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`skeleton-card ${className}`}>
      {showImage && (
        <Skeleton 
          width="100%" 
          height="200px" 
          borderRadius="8px 8px 0 0"
          className="skeleton-image"
        />
      )}
      <div className="skeleton-content">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            key={index}
            width={index === lines - 1 ? '60%' : '100%'}
            height="1rem"
            className="skeleton-line"
          />
        ))}
      </div>
    </div>
  )
}