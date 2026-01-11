/**
 * RetryHandler - Exponential backoff retry mechanism for failed requests
 * 
 * Implements retry logic with exponential backoff for handling transient
 * failures when scraping manhwaz.com. Provides configurable retry attempts,
 * delays, and backoff strategies.
 * 
 * Requirements: 5.2, 5.3
 */

import winston from 'winston'

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitterEnabled?: boolean
}

export interface RetryContext {
  operation: string
  attempt: number
  totalAttempts: number
  delay: number
  error?: Error
}

export type RetryPredicate = (error: Error, context: RetryContext) => boolean

/**
 * Default retry predicate that retries on network errors and 5xx status codes
 */
export const defaultRetryPredicate: RetryPredicate = (error: Error, context: RetryContext): boolean => {
  // Don't retry on final attempt
  if (context.attempt >= context.totalAttempts) {
    return false
  }

  // Retry on network errors
  if (error.message.includes('ECONNRESET') || 
      error.message.includes('ETIMEDOUT') || 
      error.message.includes('ENOTFOUND')) {
    return true
  }

  // Retry on 5xx server errors and 429 rate limiting
  if ('status' in error) {
    const status = (error as any).status
    return status >= 500 || status === 429
  }

  return false
}

/**
 * Retry handler with exponential backoff
 */
export class RetryHandler {
  private config: RetryConfig
  private logger: winston.Logger

  constructor(config: RetryConfig, logger?: winston.Logger) {
    this.validateConfig(config)
    this.config = config
    
    this.logger = logger || winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'retry-handler' },
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    })
  }

  /**
   * Executes an operation with retry logic
   * @param operation - Async operation to execute
   * @param operationName - Name for logging purposes
   * @param retryPredicate - Custom predicate to determine if retry should occur
   * @returns Promise resolving to operation result
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    retryPredicate: RetryPredicate = defaultRetryPredicate
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      const context: RetryContext = {
        operation: operationName,
        attempt,
        totalAttempts: this.config.maxAttempts,
        delay: 0
      }

      try {
        this.logger.debug('Executing operation', {
          operation: operationName,
          attempt,
          totalAttempts: this.config.maxAttempts
        })

        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        context.error = lastError

        this.logger.warn('Operation failed', {
          operation: operationName,
          attempt,
          totalAttempts: this.config.maxAttempts,
          error: lastError.message,
          stack: lastError.stack
        })

        // Check if we should retry
        if (!retryPredicate(lastError, context)) {
          this.logger.info('Retry predicate returned false, not retrying', {
            operation: operationName,
            attempt,
            error: lastError.message
          })
          break
        }

        // Don't delay after the last attempt
        if (attempt === this.config.maxAttempts) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt)
        context.delay = delay

        this.logger.info('Retrying operation', {
          operation: operationName,
          attempt,
          nextAttempt: attempt + 1,
          delay,
          error: lastError.message
        })

        await this.delay(delay)
      }
    }

    // All attempts failed
    const finalError = new Error(
      `Operation '${operationName}' failed after ${this.config.maxAttempts} attempts. Last error: ${lastError?.message}`
    )
    
    // Preserve original error stack if available
    if (lastError?.stack) {
      finalError.stack = lastError.stack
    }

    this.logger.error('All retry attempts exhausted', {
      operation: operationName,
      totalAttempts: this.config.maxAttempts,
      finalError: finalError.message
    })

    throw finalError
  }

  /**
   * Calculates delay for the given attempt with exponential backoff
   * @param attempt - Current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  private calculateDelay(attempt: number): number {
    // Calculate exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1)
    
    // Apply jitter if enabled (±25% random variation)
    if (this.config.jitterEnabled) {
      const jitterRange = delay * 0.25
      const jitter = (Math.random() - 0.5) * 2 * jitterRange
      delay += jitter
    }
    
    // Cap at maximum delay
    return Math.min(delay, this.config.maxDelay)
  }

  /**
   * Creates a delay promise
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after the delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Gets current retry configuration
   * @returns Current configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config }
  }

  /**
   * Updates retry configuration
   * @param newConfig - New configuration (partial update)
   */
  updateConfig(newConfig: Partial<RetryConfig>): void {
    const updatedConfig = { ...this.config, ...newConfig }
    this.validateConfig(updatedConfig)
    this.config = updatedConfig
  }

  /**
   * Validates retry configuration
   */
  private validateConfig(config: RetryConfig): void {
    if (!config) {
      throw new Error('Retry configuration is required')
    }
    if (config.maxAttempts <= 0) {
      throw new Error('Max attempts must be positive')
    }
    if (config.baseDelay <= 0) {
      throw new Error('Base delay must be positive')
    }
    if (config.maxDelay <= 0) {
      throw new Error('Max delay must be positive')
    }
    if (config.maxDelay < config.baseDelay) {
      throw new Error('Max delay must be greater than or equal to base delay')
    }
    if (config.backoffMultiplier <= 1) {
      throw new Error('Backoff multiplier must be greater than 1')
    }
  }
}