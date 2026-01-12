import * as winston from 'winston'
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  NetworkError,
  ScrapingError,
  ErrorRecoveryStrategy
} from '../types/errors'
import { errorService } from './ErrorService'

export interface ErrorContext {
  operation: string
  url?: string
  selector?: string
  statusCode?: number
  responseTime?: number
  retryCount?: number
  userAgent?: string
  timestamp: Date
}

export interface FailurePattern {
  type: 'parsing' | 'network' | 'structure' | 'rate_limit' | 'timeout'
  pattern: RegExp | string
  severity: ErrorSeverity
  recoverable: boolean
}

/**
 * Enhanced error handler with comprehensive logging and failure detection
 * Implements requirements 8.1, 8.2, 8.3 for detailed error handling
 */
export class ErrorHandler {
  private logger: winston.Logger
  private failurePatterns: FailurePattern[] = []
  private structureChangeDetector: Map<string, string> = new Map()
  private errorCounts: Map<string, number> = new Map()
  private lastStructureHashes: Map<string, string> = new Map()

  constructor() {
    this.logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'manhwaz-error-handler' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        }),
        // File transports disabled in test environment
        ...(process.env.NODE_ENV !== 'test' ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error'
          }),
          new winston.transports.File({
            filename: 'logs/combined.log'
          })
        ] : [])
      ]
    })

    this.setupFailurePatterns()
  }

  /**
   * Handle and log errors with comprehensive context
   * Requirement 8.1: Detailed logging for all failure scenarios
   */
  async handleError(
    error: Error | AppError,
    context: ErrorContext
  ): Promise<AppError> {
    const timestamp = new Date()
    const errorId = this.generateErrorId()

    // Create standardized error if needed
    let appError: AppError
    if ('id' in error) {
      appError = error
    } else {
      appError = this.createAppError(error, context)
    }

    // Log detailed error information
    this.logger.error('Error occurred during operation', {
      errorId,
      operation: context.operation,
      url: context.url,
      selector: context.selector,
      statusCode: context.statusCode,
      responseTime: context.responseTime,
      retryCount: context.retryCount,
      userAgent: context.userAgent,
      timestamp,
      errorType: appError.type,
      severity: appError.severity,
      message: appError.message,
      stack: error.stack,
      context: appError.context
    })

    // Detect failure patterns
    const actualError = error instanceof Error ? error : new Error(appError.message || 'Unknown error')
    const failureType = this.detectFailurePattern(actualError, context)
    if (failureType) {
      this.logger.warn('Failure pattern detected', {
        errorId,
        failureType: failureType.type,
        pattern: failureType.pattern.toString(),
        severity: failureType.severity,
        recoverable: failureType.recoverable,
        operation: context.operation
      })
    }

    // Check for structure changes
    if (context.url && context.selector) {
      const structureChanged = await this.detectStructureChange(context.url, context.selector, actualError)
      if (structureChanged) {
        this.logger.error('Website structure change detected', {
          errorId,
          url: context.url,
          selector: context.selector,
          operation: context.operation,
          timestamp
        })

        // Create structure change error
        const structureError = errorService.createScrapingError(
          'Website structure has changed, selector no longer works',
          {
            sourceUrl: context.url,
            selector: context.selector,
            severity: ErrorSeverity.HIGH
          }
        )

        return structureError
      }
    }

    // Track error frequency
    this.trackErrorFrequency(appError.type, context.operation)

    // Attempt recovery if possible
    const recovered = await this.attemptRecovery(appError, context)
    if (recovered) {
      this.logger.info('Error recovery successful', {
        errorId,
        operation: context.operation,
        errorType: appError.type
      })
    }

    return appError
  }

  /**
   * Detect parsing errors and structure changes
   * Requirement 8.3: Failure detection for parsing errors and structure changes
   */
  async detectStructureChange(url: string, selector: string, error: Error): Promise<boolean> {
    const key = `${url}:${selector}`

    // Check if this is a parsing-related error
    const isParsingError = this.isParsingError(error)
    if (!isParsingError) {
      return false
    }

    // Track consecutive failures for this selector
    const errorKey = `parsing:${key}`
    const currentCount = this.errorCounts.get(errorKey) || 0
    this.errorCounts.set(errorKey, currentCount + 1)

    // If we've seen multiple failures for the same selector, likely a structure change
    if (currentCount >= 3) {
      this.logger.warn('Multiple parsing failures detected, possible structure change', {
        url,
        selector,
        failureCount: currentCount + 1
      })
      return true
    }

    return false
  }

  /**
   * Create comprehensive app error from generic error
   */
  private createAppError(error: Error, context: ErrorContext): AppError {
    let errorType = ErrorType.UNKNOWN
    let severity = ErrorSeverity.MEDIUM

    // Determine error type based on context and error message
    if (context.statusCode) {
      errorType = ErrorType.NETWORK
      severity = context.statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM
    } else if (context.selector || error.message.includes('selector')) {
      errorType = ErrorType.SCRAPING
      severity = ErrorSeverity.MEDIUM
    } else if (error.message.includes('timeout')) {
      errorType = ErrorType.TIMEOUT
      severity = ErrorSeverity.MEDIUM
    }

    return errorService.createError(errorType, error.message, {
      severity,
      details: error.stack,
      context: {
        operation: context.operation,
        url: context.url,
        selector: context.selector,
        statusCode: context.statusCode,
        responseTime: context.responseTime,
        retryCount: context.retryCount
      },
      retryable: this.isRetryableError(error, context),
      originalError: error
    })
  }

  /**
   * Detect specific failure patterns
   */
  private detectFailurePattern(error: Error, context: ErrorContext): FailurePattern | null {
    const errorMessage = error.message.toLowerCase()

    for (const pattern of this.failurePatterns) {
      if (pattern.pattern instanceof RegExp) {
        if (pattern.pattern.test(errorMessage)) {
          return pattern
        }
      } else {
        if (errorMessage.includes(pattern.pattern.toLowerCase())) {
          return pattern
        }
      }
    }

    return null
  }

  /**
   * Check if error is parsing-related
   */
  private isParsingError(error: Error): boolean {
    const parsingKeywords = [
      'selector',
      'element not found',
      'cheerio',
      'parse',
      'extract',
      'undefined property',
      'cannot read property'
    ]

    const errorMessage = error.message.toLowerCase()
    return parsingKeywords.some(keyword => errorMessage.includes(keyword))
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: Error, context: ErrorContext): boolean {
    // Network errors are generally retryable
    if (context.statusCode) {
      return context.statusCode >= 500 || context.statusCode === 429 || context.statusCode === 408
    }

    // Timeout errors are retryable
    if (error.message.includes('timeout')) {
      return true
    }

    // Parsing errors are generally not retryable (structure issue)
    if (this.isParsingError(error)) {
      return false
    }

    return true
  }

  /**
   * Track error frequency for pattern detection
   */
  private trackErrorFrequency(errorType: ErrorType, operation: string): void {
    const key = `${errorType}:${operation}`
    const currentCount = this.errorCounts.get(key) || 0
    this.errorCounts.set(key, currentCount + 1)

    // Log if error frequency is high
    if (currentCount > 5) {
      this.logger.warn('High error frequency detected', {
        errorType,
        operation,
        count: currentCount + 1
      })
    }
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(error: AppError, context: ErrorContext): Promise<boolean> {
    try {
      const recovered = await errorService.handleError(error)
      if (recovered) {
        this.logger.info('Error recovery attempted', {
          errorType: error.type,
          operation: context.operation,
          success: recovered
        })
      }
      return recovered
    } catch (recoveryError) {
      this.logger.error('Error recovery failed', {
        originalError: error.type,
        operation: context.operation,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Setup common failure patterns for detection
   */
  private setupFailurePatterns(): void {
    this.failurePatterns = [
      {
        type: 'parsing',
        pattern: /selector.*not found|element.*undefined|cheerio.*error/i,
        severity: ErrorSeverity.HIGH,
        recoverable: false
      },
      {
        type: 'network',
        pattern: /network error|connection.*failed|timeout/i,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true
      },
      {
        type: 'rate_limit',
        pattern: /rate limit|too many requests|429/i,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true
      },
      {
        type: 'structure',
        pattern: /unexpected.*structure|layout.*changed|missing.*element/i,
        severity: ErrorSeverity.HIGH,
        recoverable: false
      },
      {
        type: 'timeout',
        pattern: /timeout|timed out|request.*timeout/i,
        severity: ErrorSeverity.MEDIUM,
        recoverable: true
      }
    ]
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): Record<string, number> {
    return Object.fromEntries(this.errorCounts)
  }

  /**
   * Clear error statistics
   */
  clearErrorStatistics(): void {
    this.errorCounts.clear()
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler()