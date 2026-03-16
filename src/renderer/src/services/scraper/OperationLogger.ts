import * as winston from 'winston'

export interface OperationMetrics {
  operationId: string
  operationName: string
  startTime: Date
  endTime?: Date
  duration?: number
  success: boolean
  url?: string
  statusCode?: number
  responseSize?: number
  retryCount?: number
  errorMessage?: string
  context?: Record<string, unknown>
}

export interface PerformanceMetrics {
  operation: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  successRate: number
  lastUpdated: Date
}

/**
 * Operation logger for debugging and performance analysis
 * Implements requirements 8.4, 8.5 for metrics collection and performance monitoring
 */
export class OperationLogger {
  private logger: winston.Logger
  private activeOperations: Map<string, OperationMetrics> = new Map()
  private completedOperations: OperationMetrics[] = []
  private performanceMetrics: Map<string, PerformanceMetrics> = new Map()
  private maxHistorySize = 1000

  constructor() {
    this.logger = winston.createLogger({
      level: 'debug',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'manhwaz-operation-logger' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.simple()
          )
        }),
        // File transports disabled in test environment
        ...(process.env.NODE_ENV !== 'test' ? [
          new winston.transports.File({
            filename: 'logs/operations.log'
          }),
          new winston.transports.File({
            filename: 'logs/performance.log',
            level: 'info'
          })
        ] : [])
      ]
    })
  }

  /**
   * Start tracking an operation
   * Requirement 8.4: Performance metrics collection
   */
  startOperation(
    operationName: string,
    context?: Record<string, unknown>
  ): string {
    const operationId = this.generateOperationId()
    const startTime = new Date()

    const metrics: OperationMetrics = {
      operationId,
      operationName,
      startTime,
      success: false,
      context
    }

    this.activeOperations.set(operationId, metrics)

    this.logger.debug('Operation started', {
      operationId,
      operationName,
      startTime: startTime.toISOString(),
      context
    })

    return operationId
  }

  /**
   * End tracking an operation with success
   * Requirement 8.5: Success rate tracking
   */
  endOperation(
    operationId: string,
    success: boolean,
    additionalData?: {
      url?: string
      statusCode?: number
      responseSize?: number
      retryCount?: number
      errorMessage?: string
    }
  ): void {
    const operation = this.activeOperations.get(operationId)
    if (!operation) {
      this.logger.warn('Attempted to end unknown operation', { operationId })
      return
    }

    const endTime = new Date()
    const duration = endTime.getTime() - operation.startTime.getTime()

    // Update operation metrics
    operation.endTime = endTime
    operation.duration = duration
    operation.success = success

    if (additionalData) {
      operation.url = additionalData.url
      operation.statusCode = additionalData.statusCode
      operation.responseSize = additionalData.responseSize
      operation.retryCount = additionalData.retryCount
      operation.errorMessage = additionalData.errorMessage
    }

    // Move to completed operations
    this.activeOperations.delete(operationId)
    this.completedOperations.push(operation)

    // Maintain history size
    if (this.completedOperations.length > this.maxHistorySize) {
      this.completedOperations = this.completedOperations.slice(-this.maxHistorySize)
    }

    // Update performance metrics
    this.updatePerformanceMetrics(operation)

    // Log operation completion
    this.logger.info('Operation completed', {
      operationId,
      operationName: operation.operationName,
      duration,
      success,
      url: operation.url,
      statusCode: operation.statusCode,
      responseSize: operation.responseSize,
      retryCount: operation.retryCount,
      errorMessage: operation.errorMessage
    })

    // Log performance warning if operation was slow
    if (duration > 10000) { // 10 seconds
      this.logger.warn('Slow operation detected', {
        operationId,
        operationName: operation.operationName,
        duration,
        url: operation.url
      })
    }
  }

  /**
   * Log operation progress for long-running operations
   */
  logProgress(
    operationId: string,
    progress: {
      step: string
      percentage?: number
      itemsProcessed?: number
      totalItems?: number
      message?: string
    }
  ): void {
    const operation = this.activeOperations.get(operationId)
    if (!operation) {
      return
    }

    this.logger.debug('Operation progress', {
      operationId,
      operationName: operation.operationName,
      step: progress.step,
      percentage: progress.percentage,
      itemsProcessed: progress.itemsProcessed,
      totalItems: progress.totalItems,
      message: progress.message,
      elapsed: Date.now() - operation.startTime.getTime()
    })
  }

  /**
   * Get performance metrics for a specific operation type
   * Requirement 8.4: Response time and success rate metrics
   */
  getPerformanceMetrics(operationName?: string): PerformanceMetrics[] {
    if (operationName) {
      const metrics = this.performanceMetrics.get(operationName)
      return metrics ? [metrics] : []
    }

    return Array.from(this.performanceMetrics.values())
  }

  /**
   * Get recent operation history
   */
  getOperationHistory(limit: number = 100): OperationMetrics[] {
    return this.completedOperations
      .slice(-limit)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }

  /**
   * Get currently active operations
   */
  getActiveOperations(): OperationMetrics[] {
    return Array.from(this.activeOperations.values())
  }

  /**
   * Get operation statistics summary
   */
  getOperationSummary(): {
    totalOperations: number
    activeOperations: number
    successRate: number
    averageResponseTime: number
    operationsByType: Record<string, number>
  } {
    const total = this.completedOperations.length
    const successful = this.completedOperations.filter(op => op.success).length
    const successRate = total > 0 ? (successful / total) * 100 : 0

    const totalDuration = this.completedOperations
      .filter(op => op.duration !== undefined)
      .reduce((sum, op) => sum + (op.duration || 0), 0)

    const averageResponseTime = total > 0 ? totalDuration / total : 0

    const operationsByType: Record<string, number> = {}
    this.completedOperations.forEach(op => {
      operationsByType[op.operationName] = (operationsByType[op.operationName] || 0) + 1
    })

    return {
      totalOperations: total,
      activeOperations: this.activeOperations.size,
      successRate,
      averageResponseTime,
      operationsByType
    }
  }

  /**
   * Clear operation history and metrics
   */
  clearHistory(): void {
    this.completedOperations = []
    this.performanceMetrics.clear()
    this.logger.info('Operation history and metrics cleared')
  }

  /**
   * Update performance metrics for an operation
   */
  private updatePerformanceMetrics(operation: OperationMetrics): void {
    const existing = this.performanceMetrics.get(operation.operationName)

    if (!existing) {
      // Create new metrics
      this.performanceMetrics.set(operation.operationName, {
        operation: operation.operationName,
        totalRequests: 1,
        successfulRequests: operation.success ? 1 : 0,
        failedRequests: operation.success ? 0 : 1,
        averageResponseTime: operation.duration || 0,
        minResponseTime: operation.duration || 0,
        maxResponseTime: operation.duration || 0,
        successRate: operation.success ? 100 : 0,
        lastUpdated: new Date()
      })
    } else {
      // Update existing metrics
      const totalRequests = existing.totalRequests + 1
      const successfulRequests = existing.successfulRequests + (operation.success ? 1 : 0)
      const failedRequests = existing.failedRequests + (operation.success ? 0 : 1)

      const duration = operation.duration || 0
      const totalDuration = (existing.averageResponseTime * existing.totalRequests) + duration

      this.performanceMetrics.set(operation.operationName, {
        operation: operation.operationName,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime: totalDuration / totalRequests,
        minResponseTime: Math.min(existing.minResponseTime, duration),
        maxResponseTime: Math.max(existing.maxResponseTime, duration),
        successRate: (successfulRequests / totalRequests) * 100,
        lastUpdated: new Date()
      })
    }
  }

  /**
   * Generate unique operation ID
   */
  private generateOperationId(): string {
    return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Log system performance metrics periodically
   */
  logSystemMetrics(): void {
    const summary = this.getOperationSummary()
    const performanceMetrics = this.getPerformanceMetrics()

    this.logger.info('System performance metrics', {
      summary,
      detailedMetrics: performanceMetrics,
      timestamp: new Date().toISOString()
    })
  }
}

// Singleton instance
export const operationLogger = new OperationLogger()