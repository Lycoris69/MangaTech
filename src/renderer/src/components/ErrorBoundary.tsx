import React, { Component, ErrorInfo, ReactNode } from 'react'
import { errorService } from '../services/ErrorService'
import { ErrorType, ErrorSeverity } from '../types/errors'
import './ErrorBoundary.css'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: null
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Create structured error
    const appError = errorService.createError(
      ErrorType.UNKNOWN,
      error.message,
      {
        severity: ErrorSeverity.HIGH,
        details: errorInfo.componentStack,
        context: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true
        },
        originalError: error,
        userMessage: 'Something went wrong while loading this section.'
      }
    )

    this.setState({ errorId: appError.id })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h2>Something went wrong</h2>
            <p>
              We're sorry, but something unexpected happened. 
              You can try refreshing the page or going back to continue using the app.
            </p>
            
            {this.state.error && (
              <details className="error-details">
                <summary>Technical Details</summary>
                <pre className="error-message">
                  {this.state.error.message}
                </pre>
                {this.state.error.stack && (
                  <pre className="error-stack">
                    {this.state.error.stack}
                  </pre>
                )}
              </details>
            )}

            <div className="error-actions">
              <button 
                onClick={this.handleRetry}
                className="retry-button primary"
              >
                Try Again
              </button>
              <button 
                onClick={this.handleReload}
                className="reload-button secondary"
              >
                Reload Page
              </button>
            </div>

            {this.state.errorId && (
              <p className="error-id">
                Error ID: {this.state.errorId}
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}