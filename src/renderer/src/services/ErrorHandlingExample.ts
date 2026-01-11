/**
 * Example demonstrating comprehensive error handling and logging
 * This shows how the new error handling system integrates with scraping operations
 */

import { scrapingMonitor } from './ScrapingMonitor'
import { errorHandler } from './ErrorHandler'
import { operationLogger } from './OperationLogger'
import { metricsCollector } from './MetricsCollector'
import { MonitoredOperation } from './ScrapingMonitor'

/**
 * Example of a monitored scraping operation
 */
export async function exampleScrapingOperation(): Promise<void> {
  // Example 1: Simple monitored operation
  const searchOperation: MonitoredOperation<string[]> = {
    operationName: 'searchManga',
    url: 'https://manhwaz.com/search?q=naruto',
    execute: async () => {
      // Simulate a scraping operation
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Simulate random success/failure
      if (Math.random() > 0.7) {
        throw new Error('Network timeout during search')
      }
      
      return ['Naruto', 'Naruto Shippuden', 'Boruto']
    }
  }

  try {
    const result = await scrapingMonitor.executeWithRetry(searchOperation, 3, 1000)
    
    if (result.success) {
      console.log('Search successful:', result.result)
      console.log('Operation metrics:', result.metrics)
    } else {
      console.error('Search failed after retries:', result.error?.message)
    }
  } catch (error) {
    console.error('Unexpected error:', error)
  }

  // Example 2: Multiple concurrent operations
  const operations: MonitoredOperation<any>[] = [
    {
      operationName: 'getLatestReleases',
      url: 'https://manhwaz.com/',
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 500))
        return ['Chapter 1', 'Chapter 2', 'Chapter 3']
      }
    },
    {
      operationName: 'getTrendingManga',
      url: 'https://manhwaz.com/trending',
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 800))
        return ['Popular Manga 1', 'Popular Manga 2']
      }
    },
    {
      operationName: 'getSeriesDetails',
      url: 'https://manhwaz.com/series/123',
      execute: async () => {
        await new Promise(resolve => setTimeout(resolve, 1200))
        if (Math.random() > 0.8) {
          throw new Error('Series not found')
        }
        return { title: 'Example Series', chapters: 100 }
      }
    }
  ]

  const results = await scrapingMonitor.executeMultipleMonitored(operations, 2)
  
  console.log('Batch operation results:')
  results.forEach((result, index) => {
    console.log(`Operation ${index + 1}:`, {
      success: result.success,
      duration: result.metrics.duration,
      error: result.error?.message
    })
  })
}

/**
 * Example of system health monitoring
 */
export function exampleHealthMonitoring(): void {
  // Check system health
  const health = scrapingMonitor.checkSystemHealth()
  
  console.log('System Health Check:')
  console.log('- Healthy:', health.healthy)
  console.log('- Issues:', health.issues)
  console.log('- Success Rate:', health.metrics.successRate.toFixed(1) + '%')
  console.log('- Average Response Time:', health.metrics.averageResponseTime.toFixed(0) + 'ms')
  console.log('- Active Operations:', health.metrics.activeOperations)

  // Generate comprehensive report
  const report = scrapingMonitor.generateReport()
  
  console.log('\nComprehensive System Report:')
  console.log('- Timestamp:', report.timestamp)
  console.log('- Recent Errors:', report.recentErrors.length)
  console.log('- Performance Metrics:', report.performanceMetrics.length)
  console.log('- Recommendations:', report.recommendations)
}

/**
 * Example of metrics collection and analysis
 */
export function exampleMetricsAnalysis(): void {
  // Get aggregated metrics for the last hour
  const metrics = metricsCollector.getAggregatedMetrics(60)
  
  console.log('Hourly Metrics Summary:')
  console.log('- Total Requests:', metrics.totalRequests)
  console.log('- Success Rate:', ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1) + '%')
  console.log('- Average Response Time:', metrics.averageResponseTime.toFixed(0) + 'ms')
  console.log('- Error Distribution:', metrics.errorsByType)
  
  console.log('\nSlowest Operations:')
  metrics.slowestOperations.forEach((op, index) => {
    console.log(`${index + 1}. ${op.operation} - ${op.responseTime}ms (${op.url})`)
  })
  
  console.log('\nFastest Operations:')
  metrics.fastestOperations.forEach((op, index) => {
    console.log(`${index + 1}. ${op.operation} - ${op.responseTime}ms (${op.url})`)
  })

  // Get success rates by operation type
  const searchSuccessRate = metricsCollector.getSuccessRate('searchManga', 60)
  const detailsSuccessRate = metricsCollector.getSuccessRate('getSeriesDetails', 60)
  
  console.log('\nSuccess Rates by Operation:')
  console.log('- Search Operations:', searchSuccessRate.toFixed(1) + '%')
  console.log('- Series Details:', detailsSuccessRate.toFixed(1) + '%')
}

/**
 * Example of error statistics and analysis
 */
export function exampleErrorAnalysis(): void {
  // Get error statistics
  const errorStats = errorHandler.getErrorStatistics()
  
  console.log('Error Statistics:')
  Object.entries(errorStats).forEach(([errorKey, count]) => {
    console.log(`- ${errorKey}: ${count} occurrences`)
  })

  // Get error distribution
  const errorDistribution = metricsCollector.getErrorDistribution(60)
  
  console.log('\nError Distribution (Last Hour):')
  Object.entries(errorDistribution).forEach(([errorType, count]) => {
    console.log(`- ${errorType}: ${count} errors`)
  })

  // Get operation history with errors
  const recentOperations = operationLogger.getOperationHistory(20)
  const failedOperations = recentOperations.filter(op => !op.success)
  
  console.log('\nRecent Failed Operations:')
  failedOperations.slice(0, 5).forEach((op, index) => {
    console.log(`${index + 1}. ${op.operationName} - ${op.errorMessage} (${op.startTime.toISOString()})`)
  })
}

/**
 * Run all examples
 */
export async function runErrorHandlingExamples(): Promise<void> {
  console.log('=== Error Handling and Logging Examples ===\n')
  
  try {
    console.log('1. Running scraping operations...')
    await exampleScrapingOperation()
    
    console.log('\n2. Checking system health...')
    exampleHealthMonitoring()
    
    console.log('\n3. Analyzing metrics...')
    exampleMetricsAnalysis()
    
    console.log('\n4. Analyzing errors...')
    exampleErrorAnalysis()
    
  } catch (error) {
    console.error('Example execution failed:', error)
  }
}

// Export for use in other parts of the application
export {
  scrapingMonitor,
  errorHandler,
  operationLogger,
  metricsCollector
}