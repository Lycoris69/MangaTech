import { ErrorHandler, ErrorContext } from './ErrorHandler'
import { OperationLogger, PerformanceMetrics, OperationMetrics } from './OperationLogger'
import { MetricsCollector } from './MetricsCollector'
import { errorHandler } from './ErrorHandler'
import { operationLogger } from './OperationLogger'
import { metricsCollector } from './MetricsCollector'

export interface MonitoredOperation<T> {
  operationName: string
  url?: string
  selector?: string
  execute: () => Promise<T>
}

export interface MonitoringResult<T> {
  success: boolean
  result?: T
  error?: Error
  metrics: {
    operationId: string
    duration: number
    responseTime: number
    retryCount: number
  }
}

export interface HealthMetrics {
  successRate: number
  averageResponseTime: number
  errorRate: number
  activeOperations: number
}

export interface SystemHealthReport {
  overallSuccessRate: number
  averageResponseTime: number
  errorRate: number
  activeOperations: number
}

/**
 * Unified monitoring service for scraping operations
 * Integrates error handling, logging, and metrics collection
 */
export class ScrapingMonitor {
  private errorHandler: ErrorHandler
  private operationLogger: OperationLogger
  private metricsCollector: MetricsCollector

  constructor(
    errorHandler: ErrorHandler,
    operationLogger: OperationLogger,
    metricsCollector: MetricsCollector
  ) {
    this.errorHandler = errorHandler
    this.operationLogger = operationLogger
    this.metricsCollector = metricsCollector
  }

  /**
   * Execute a monitored scraping operation with comprehensive logging and error handling
   */
  async executeMonitored<T>(
    operation: MonitoredOperation<T>,
    retryCount: number = 0
  ): Promise<MonitoringResult<T>> {
    const operationId = this.operationLogger.startOperation(operation.operationName, {
      url: operation.url,
      selector: operation.selector,
      retryCount
    })

    const startTime = Date.now()
    let result: T | undefined
    let error: Error | undefined
    let success = false

    try {
      // Execute the operation
      result = await operation.execute()
      success = true

      // Log successful completion
      const duration = Date.now() - startTime
      this.operationLogger.endOperation(operationId, true, {
        url: operation.url,
        statusCode: 200,
        retryCount
      })

      // Record metrics
      this.metricsCollector.recordScrapingMetrics({
        url: operation.url || 'unknown',
        operation: operation.operationName,
        responseTime: duration,
        statusCode: 200,
        success: true,
        retryCount
      })

      return {
        success: true,
        result,
        metrics: {
          operationId,
          duration,
          responseTime: duration,
          retryCount
        }
      }

    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err))
      const duration = Date.now() - startTime

      // Create error context
      const errorContext: ErrorContext = {
        operation: operation.operationName,
        url: operation.url,
        selector: operation.selector,
        responseTime: duration,
        retryCount,
        timestamp: new Date()
      }

      // Handle error with comprehensive logging
      const appError = await this.errorHandler.handleError(error, errorContext)

      // Log failed operation
      this.operationLogger.endOperation(operationId, false, {
        url: operation.url,
        retryCount,
        errorMessage: error.message
      })

      // Record failure metrics
      this.metricsCollector.recordScrapingMetrics({
        url: operation.url || 'unknown',
        operation: operation.operationName,
        responseTime: duration,
        success: false,
        errorType: appError.type,
        retryCount
      })

      return {
        success: false,
        error,
        metrics: {
          operationId,
          duration,
          responseTime: duration,
          retryCount
        }
      }
    }
  }

  /**
   * Execute operation with automatic retry logic
   */
  async executeWithRetry<T>(
    operation: MonitoredOperation<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<MonitoringResult<T>> {
    let lastResult: MonitoringResult<T> | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      lastResult = await this.executeMonitored(operation, attempt)

      if (lastResult.success) {
        return lastResult
      }

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        // Calculate exponential backoff delay
        const delay = retryDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    return lastResult!
  }

  /**
   * Monitor multiple operations concurrently
   */
  async executeMultipleMonitored<T>(
    operations: MonitoredOperation<T>[],
    concurrency: number = 3
  ): Promise<MonitoringResult<T>[]> {
    const results: MonitoringResult<T>[] = []

    // Process operations in batches to respect concurrency limit
    for (let i = 0; i < operations.length; i += concurrency) {
      const batch = operations.slice(i, i + concurrency)
      const batchPromises = batch.map(op => this.executeMonitored(op))
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Get monitoring statistics
   */
  getMonitoringStats(): {
    errorStats: Record<string, number>
    performanceMetrics: PerformanceMetrics[]
    systemHealth: SystemHealthReport
  } {
    const report = this.metricsCollector.generateMetricsReport()

    return {
      errorStats: this.errorHandler.getErrorStatistics(),
      performanceMetrics: report.performanceMetrics,
      systemHealth: report.systemHealth
    }
  }

  /**
   * Check system health
   */
  checkSystemHealth(): {
    healthy: boolean
    issues: string[]
    metrics: HealthMetrics
  } {
    const report = this.metricsCollector.generateMetricsReport()
    const health = report.systemHealth

    const issues: string[] = []
    let healthy = true

    // Check success rate
    if (health.overallSuccessRate < 90) {
      issues.push(`Low success rate: ${health.overallSuccessRate.toFixed(1)}%`)
      healthy = false
    }

    // Check response time
    if (health.averageResponseTime > 5000) {
      issues.push(`High response time: ${health.averageResponseTime.toFixed(0)}ms`)
      healthy = false
    }

    // Check error rate
    if (health.errorRate > 10) {
      issues.push(`High error rate: ${health.errorRate.toFixed(1)}%`)
      healthy = false
    }

    // Check for too many active operations (potential hanging)
    if (health.activeOperations > 10) {
      issues.push(`Too many active operations: ${health.activeOperations}`)
      healthy = false
    }

    return {
      healthy,
      issues,
      metrics: {
        successRate: health.overallSuccessRate,
        averageResponseTime: health.averageResponseTime,
        errorRate: health.errorRate,
        activeOperations: health.activeOperations
      }
    }
  }

  /**
   * Generate comprehensive monitoring report
   */
  generateReport(): {
    timestamp: string
    systemHealth: SystemHealthReport
    recentErrors: OperationMetrics[]
    performanceMetrics: PerformanceMetrics[]
    recommendations: string[]
  } {
    const report = this.metricsCollector.generateMetricsReport()
    const health = this.checkSystemHealth()
    const recentOperations = this.operationLogger.getOperationHistory(50)
    const recentErrors = recentOperations.filter(op => !op.success)

    const recommendations: string[] = []

    // Generate recommendations based on metrics
    if (health.metrics.successRate < 95) {
      recommendations.push('Consider implementing additional error recovery strategies')
    }

    if (health.metrics.averageResponseTime > 3000) {
      recommendations.push('Optimize scraping operations or implement caching')
    }

    if (recentErrors.length > 5) {
      recommendations.push('Investigate recent error patterns for potential fixes')
    }

    if (health.metrics.activeOperations > 5) {
      recommendations.push('Monitor for hanging operations and implement timeouts')
    }

    return {
      timestamp: new Date().toISOString(),
      systemHealth: report.systemHealth,
      recentErrors: recentErrors.slice(0, 10),
      performanceMetrics: report.performanceMetrics,
      recommendations
    }
  }
}

// Create singleton instance
export const scrapingMonitor = new ScrapingMonitor(
  errorHandler,
  operationLogger,
  metricsCollector
)