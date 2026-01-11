import * as winston from 'winston'
import { OperationLogger, PerformanceMetrics } from './OperationLogger'
import { ErrorHandler } from './ErrorHandler'

export interface ScrapingMetrics {
  url: string
  operation: string
  responseTime: number
  statusCode?: number
  success: boolean
  errorType?: string
  retryCount?: number
  timestamp: Date
}

export interface AggregatedMetrics {
  timeWindow: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  errorsByType: Record<string, number>
  slowestOperations: Array<{
    operation: string
    url: string
    responseTime: number
  }>
  fastestOperations: Array<{
    operation: string
    url: string
    responseTime: number
  }>
}

/**
 * Comprehensive metrics collection service
 * Implements requirements 8.4, 8.5 for response times and success rates
 */
export class MetricsCollector {
  private logger: winston.Logger
  private operationLogger: OperationLogger
  private errorHandler: ErrorHandler
  private scrapingMetrics: ScrapingMetrics[] = []
  private maxMetricsHistory = 10000
  private metricsAggregationInterval: NodeJS.Timeout | null = null

  constructor(operationLogger: OperationLogger, errorHandler: ErrorHandler) {
    this.operationLogger = operationLogger
    this.errorHandler = errorHandler

    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'manhwaz-metrics-collector' },
      transports: process.env.NODE_ENV === 'test' 
        ? [
            new winston.transports.Console({
              format: winston.format.simple()
            })
          ]
        : [
            new winston.transports.File({
              filename: 'logs/metrics.log'
            }),
            new winston.transports.Console({
              format: winston.format.simple()
            })
          ]
    })

    // Start periodic metrics aggregation
    this.startMetricsAggregation()
  }

  /**
   * Record scraping operation metrics
   * Requirement 8.4: Response time collection
   */
  recordScrapingMetrics(metrics: Omit<ScrapingMetrics, 'timestamp'>): void {
    const scrapingMetric: ScrapingMetrics = {
      ...metrics,
      timestamp: new Date()
    }

    this.scrapingMetrics.push(scrapingMetric)

    // Maintain history size
    if (this.scrapingMetrics.length > this.maxMetricsHistory) {
      this.scrapingMetrics = this.scrapingMetrics.slice(-this.maxMetricsHistory)
    }

    // Log detailed metrics
    this.logger.info('Scraping metrics recorded', {
      url: metrics.url,
      operation: metrics.operation,
      responseTime: metrics.responseTime,
      statusCode: metrics.statusCode,
      success: metrics.success,
      errorType: metrics.errorType,
      retryCount: metrics.retryCount
    })

    // Log performance warnings
    if (metrics.responseTime > 5000) {
      this.logger.warn('Slow scraping operation detected', {
        url: metrics.url,
        operation: metrics.operation,
        responseTime: metrics.responseTime
      })
    }

    if (!metrics.success) {
      this.logger.warn('Failed scraping operation', {
        url: metrics.url,
        operation: metrics.operation,
        errorType: metrics.errorType,
        statusCode: metrics.statusCode,
        retryCount: metrics.retryCount
      })
    }
  }

  /**
   * Get aggregated metrics for a time window
   * Requirement 8.5: Success rate calculation
   */
  getAggregatedMetrics(timeWindowMinutes: number = 60): AggregatedMetrics {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
    const recentMetrics = this.scrapingMetrics.filter(
      metric => metric.timestamp >= cutoffTime
    )

    const totalRequests = recentMetrics.length
    const successfulRequests = recentMetrics.filter(m => m.success).length
    const failedRequests = totalRequests - successfulRequests

    const averageResponseTime = totalRequests > 0
      ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
      : 0

    // Group errors by type
    const errorsByType: Record<string, number> = {}
    recentMetrics
      .filter(m => !m.success && m.errorType)
      .forEach(m => {
        errorsByType[m.errorType!] = (errorsByType[m.errorType!] || 0) + 1
      })

    // Find slowest operations
    const slowestOperations = recentMetrics
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, 5)
      .map(m => ({
        operation: m.operation,
        url: m.url,
        responseTime: m.responseTime
      }))

    // Find fastest operations
    const fastestOperations = recentMetrics
      .filter(m => m.success)
      .sort((a, b) => a.responseTime - b.responseTime)
      .slice(0, 5)
      .map(m => ({
        operation: m.operation,
        url: m.url,
        responseTime: m.responseTime
      }))

    return {
      timeWindow: `${timeWindowMinutes} minutes`,
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      errorsByType,
      slowestOperations,
      fastestOperations
    }
  }

  /**
   * Get success rate for specific operation type
   */
  getSuccessRate(operation?: string, timeWindowMinutes: number = 60): number {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
    let relevantMetrics = this.scrapingMetrics.filter(
      metric => metric.timestamp >= cutoffTime
    )

    if (operation) {
      relevantMetrics = relevantMetrics.filter(m => m.operation === operation)
    }

    if (relevantMetrics.length === 0) {
      return 0
    }

    const successfulRequests = relevantMetrics.filter(m => m.success).length
    return (successfulRequests / relevantMetrics.length) * 100
  }

  /**
   * Get average response time for specific operation type
   */
  getAverageResponseTime(operation?: string, timeWindowMinutes: number = 60): number {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
    let relevantMetrics = this.scrapingMetrics.filter(
      metric => metric.timestamp >= cutoffTime && metric.success
    )

    if (operation) {
      relevantMetrics = relevantMetrics.filter(m => m.operation === operation)
    }

    if (relevantMetrics.length === 0) {
      return 0
    }

    const totalResponseTime = relevantMetrics.reduce((sum, m) => sum + m.responseTime, 0)
    return totalResponseTime / relevantMetrics.length
  }

  /**
   * Get error distribution
   */
  getErrorDistribution(timeWindowMinutes: number = 60): Record<string, number> {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000)
    const failedMetrics = this.scrapingMetrics.filter(
      metric => metric.timestamp >= cutoffTime && !metric.success && metric.errorType
    )

    const distribution: Record<string, number> = {}
    failedMetrics.forEach(metric => {
      distribution[metric.errorType!] = (distribution[metric.errorType!] || 0) + 1
    })

    return distribution
  }

  /**
   * Generate comprehensive metrics report
   */
  generateMetricsReport(): {
    summary: AggregatedMetrics
    performanceMetrics: PerformanceMetrics[]
    errorStatistics: Record<string, number>
    systemHealth: {
      overallSuccessRate: number
      averageResponseTime: number
      errorRate: number
      activeOperations: number
    }
  } {
    const summary = this.getAggregatedMetrics(60)
    const performanceMetrics = this.operationLogger.getPerformanceMetrics()
    const errorStatistics = this.errorHandler.getErrorStatistics()
    const operationSummary = this.operationLogger.getOperationSummary()

    const systemHealth = {
      overallSuccessRate: operationSummary.successRate,
      averageResponseTime: operationSummary.averageResponseTime,
      errorRate: 100 - operationSummary.successRate,
      activeOperations: operationSummary.activeOperations
    }

    return {
      summary,
      performanceMetrics,
      errorStatistics,
      systemHealth
    }
  }

  /**
   * Start periodic metrics aggregation and logging
   */
  private startMetricsAggregation(): void {
    // Log aggregated metrics every 5 minutes
    this.metricsAggregationInterval = setInterval(() => {
      const report = this.generateMetricsReport()
      
      this.logger.info('Periodic metrics report', {
        timestamp: new Date().toISOString(),
        report
      })

      // Log system health warnings
      if (report.systemHealth.overallSuccessRate < 90) {
        this.logger.warn('Low system success rate detected', {
          successRate: report.systemHealth.overallSuccessRate,
          errorRate: report.systemHealth.errorRate
        })
      }

      if (report.systemHealth.averageResponseTime > 3000) {
        this.logger.warn('High average response time detected', {
          averageResponseTime: report.systemHealth.averageResponseTime
        })
      }

    }, 5 * 60 * 1000) // 5 minutes
  }

  /**
   * Stop metrics aggregation
   */
  stopMetricsAggregation(): void {
    if (this.metricsAggregationInterval) {
      clearInterval(this.metricsAggregationInterval)
      this.metricsAggregationInterval = null
    }
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.scrapingMetrics = []
    this.logger.info('Metrics history cleared')
  }

  /**
   * Export metrics data for analysis
   */
  exportMetrics(): {
    scrapingMetrics: ScrapingMetrics[]
    aggregatedMetrics: AggregatedMetrics
    performanceMetrics: PerformanceMetrics[]
  } {
    return {
      scrapingMetrics: [...this.scrapingMetrics],
      aggregatedMetrics: this.getAggregatedMetrics(),
      performanceMetrics: this.operationLogger.getPerformanceMetrics()
    }
  }
}

// Create singleton instance
import { operationLogger } from './OperationLogger'
import { errorHandler } from './ErrorHandler'

export const metricsCollector = new MetricsCollector(operationLogger, errorHandler)