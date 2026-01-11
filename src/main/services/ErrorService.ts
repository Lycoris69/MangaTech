import { 
  AppError, 
  ErrorType, 
  ErrorSeverity, 
  NetworkError, 
  FileSystemError, 
  ScrapingError, 
  StorageError,
  ErrorRecoveryStrategy,
  ErrorReporter
} from '../types/errors'

export class ErrorService {
  private static instance: ErrorService
  private errorHistory: AppError[] = []
  private recoveryStrategies: Map<ErrorType, ErrorRecoveryStrategy> = new Map()
  private reporters: ErrorReporter[] = []
  private maxHistorySize = 100

  private constructor() {
    this.setupDefaultRecoveryStrategies()
  }

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService()
    }
    return ErrorService.instance
  }

  /**
   * Create a standardized error object
   */
  createError(
    type: ErrorType,
    message: string,
    options: {
      severity?: ErrorSeverity
      details?: string
      context?: Record<string, any>
      retryable?: boolean
      userMessage?: string
      originalError?: Error
    } = {}
  ): AppError {
    const {
      severity = ErrorSeverity.MEDIUM,
      details,
      context,
      retryable = false,
      userMessage,
      originalError
    } = options

    const error: AppError = {
      id: this.generateErrorId(),
      type,
      severity,
      message,
      details,
      timestamp: new Date(),
      context,
      stack: originalError?.stack || new Error().stack,
      retryable,
      userMessage: userMessage || this.getDefaultUserMessage(type, message)
    }

    this.addToHistory(error)
    this.reportError(error)

    return error
  }

  /**
   * Create network-specific error
   */
  createNetworkError(
    message: string,
    options: {
      statusCode?: number
      url?: string
      isOffline?: boolean
      severity?: ErrorSeverity
      retryable?: boolean
    } = {}
  ): NetworkError {
    const baseError = this.createError(ErrorType.NETWORK, message, {
      severity: options.severity || ErrorSeverity.MEDIUM,
      retryable: options.retryable ?? true,
      context: {
        statusCode: options.statusCode,
        url: options.url,
        isOffline: options.isOffline
      }
    })

    return {
      ...baseError,
      type: ErrorType.NETWORK,
      statusCode: options.statusCode,
      url: options.url,
      isOffline: options.isOffline
    }
  }

  /**
   * Create file system error
   */
  createFileSystemError(
    message: string,
    options: {
      filePath?: string
      operation?: 'read' | 'write' | 'delete' | 'create'
      permissions?: boolean
      severity?: ErrorSeverity
    } = {}
  ): FileSystemError {
    const baseError = this.createError(ErrorType.FILE_SYSTEM, message, {
      severity: options.severity || ErrorSeverity.HIGH,
      retryable: options.operation !== 'delete',
      context: {
        filePath: options.filePath,
        operation: options.operation,
        permissions: options.permissions
      }
    })

    return {
      ...baseError,
      type: ErrorType.FILE_SYSTEM,
      filePath: options.filePath,
      operation: options.operation,
      permissions: options.permissions
    }
  }

  /**
   * Create scraping error
   */
  createScrapingError(
    message: string,
    options: {
      sourceUrl?: string
      selector?: string
      rateLimited?: boolean
      severity?: ErrorSeverity
    } = {}
  ): ScrapingError {
    const baseError = this.createError(ErrorType.SCRAPING, message, {
      severity: options.severity || ErrorSeverity.MEDIUM,
      retryable: !options.rateLimited,
      context: {
        sourceUrl: options.sourceUrl,
        selector: options.selector,
        rateLimited: options.rateLimited
      }
    })

    return {
      ...baseError,
      type: ErrorType.SCRAPING,
      sourceUrl: options.sourceUrl,
      selector: options.selector,
      rateLimited: options.rateLimited
    }
  }

  /**
   * Create storage error
   */
  createStorageError(
    message: string,
    options: {
      operation?: 'save' | 'load' | 'delete' | 'update'
      dataType?: string
      severity?: ErrorSeverity
    } = {}
  ): StorageError {
    const baseError = this.createError(ErrorType.STORAGE, message, {
      severity: options.severity || ErrorSeverity.HIGH,
      retryable: options.operation !== 'delete',
      context: {
        operation: options.operation,
        dataType: options.dataType
      }
    })

    return {
      ...baseError,
      type: ErrorType.STORAGE,
      operation: options.operation,
      dataType: options.dataType
    }
  }

  /**
   * Handle error with recovery strategies
   */
  async handleError(error: AppError): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(error.type)
    
    if (strategy && strategy.canRecover(error)) {
      try {
        await strategy.recover(error)
        return true
      } catch (recoveryError) {
        console.error('Error recovery failed:', recoveryError)
        
        if (strategy.fallback) {
          try {
            await strategy.fallback()
            return true
          } catch (fallbackError) {
            console.error('Fallback strategy failed:', fallbackError)
          }
        }
      }
    }

    return false
  }

  /**
   * Get error history
   */
  getErrorHistory(): AppError[] {
    return [...this.errorHistory]
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = []
  }

  /**
   * Add error reporter
   */
  addReporter(reporter: ErrorReporter): void {
    this.reporters.push(reporter)
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: AppError): boolean {
    return error.retryable && error.severity !== ErrorSeverity.CRITICAL
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: AppError): string {
    return error.userMessage
  }

  /**
   * Check network connectivity
   */
  async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      })
      return true
    } catch {
      return false
    }
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error)
    
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize)
    }
  }

  private async reportError(error: AppError): Promise<void> {
    for (const reporter of this.reporters) {
      try {
        await reporter.report(error)
      } catch (reportingError) {
        console.error('Failed to report error:', reportingError)
      }
    }
  }

  private getDefaultUserMessage(type: ErrorType, message: string): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.'
      case ErrorType.FILE_SYSTEM:
        return 'File system error. Please check file permissions and available storage space.'
      case ErrorType.SCRAPING:
        return 'Unable to load content from source. The website may be temporarily unavailable.'
      case ErrorType.STORAGE:
        return 'Data storage error. Your changes may not have been saved properly.'
      case ErrorType.VALIDATION:
        return 'Invalid input provided. Please check your data and try again.'
      case ErrorType.PERMISSION:
        return 'Permission denied. Please check your access rights.'
      case ErrorType.TIMEOUT:
        return 'Operation timed out. Please try again.'
      default:
        return 'An unexpected error occurred. Please try again or contact support.'
    }
  }

  private setupDefaultRecoveryStrategies(): void {
    // Network error recovery
    this.recoveryStrategies.set(ErrorType.NETWORK, {
      canRecover: (error) => error.retryable,
      recover: async (error) => {
        const isOnline = await this.checkNetworkConnectivity()
        if (!isOnline) {
          throw new Error('Still offline')
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000))
      },
      fallback: async () => {
        // Switch to offline mode or cached data
        console.log('Switching to offline mode')
      }
    })

    // File system error recovery
    this.recoveryStrategies.set(ErrorType.FILE_SYSTEM, {
      canRecover: (error) => error.retryable,
      recover: async (error) => {
        // Try to create directory structure if missing
        if (error.context?.operation === 'write') {
          // Implementation would depend on the specific file system service
          console.log('Attempting to create directory structure')
        }
      }
    })

    // Scraping error recovery
    this.recoveryStrategies.set(ErrorType.SCRAPING, {
      canRecover: (error) => error.retryable && !error.context?.rateLimited,
      recover: async (error) => {
        // Wait longer for rate-limited requests
        const delay = error.context?.rateLimited ? 5000 : 2000
        await new Promise(resolve => setTimeout(resolve, delay))
      },
      fallback: async () => {
        // Try alternative sources
        console.log('Attempting alternative sources')
      }
    })
  }
}

// Singleton instance
export const errorService = ErrorService.getInstance()