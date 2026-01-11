/**
 * CachePerformanceDemo - Demonstration component for caching and performance optimization
 * 
 * This component shows how the ContentCacheService and PerformanceOptimizer
 * improve the application's performance and user experience.
 */

import React, { useState, useEffect } from 'react'
import { ManhwazScraper } from '../services/ManhwazScraper'
import { CacheStats } from '../services/ContentCacheService'
import { PerformanceMetrics } from '../services/PerformanceOptimizer'
import './CachePerformanceDemo.css'

interface CachePerformanceDemoProps {
  scraper: ManhwazScraper
}

export const CachePerformanceDemo: React.FC<CachePerformanceDemoProps> = ({ scraper }) => {
  const [stats, setStats] = useState<{
    cache: CacheStats
    performance: PerformanceMetrics
    queue: ReturnType<typeof scraper.getPerformanceOptimizer>['getQueueStats']
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Update stats every 2 seconds
  useEffect(() => {
    const updateStats = () => {
      try {
        const performanceStats = scraper.getPerformanceStats()
        setStats({
          cache: performanceStats.cache,
          performance: performanceStats.performance,
          queue: performanceStats.queue
        })
        setLastUpdate(new Date())
      } catch (error) {
        console.error('Failed to get performance stats:', error)
      }
    }

    updateStats()
    const interval = setInterval(updateStats, 2000)

    return () => clearInterval(interval)
  }, [scraper])

  const handleTestCaching = async () => {
    setIsLoading(true)
    try {
      console.log('Testing cache performance...')
      
      // First request (should hit the network)
      const start1 = Date.now()
      await scraper.getLatestReleases()
      const time1 = Date.now() - start1
      
      // Second request (should hit the cache)
      const start2 = Date.now()
      await scraper.getLatestReleases()
      const time2 = Date.now() - start2
      
      console.log(`First request (network): ${time1}ms`)
      console.log(`Second request (cache): ${time2}ms`)
      console.log(`Cache speedup: ${Math.round((time1 / time2) * 100) / 100}x faster`)
      
    } catch (error) {
      console.error('Cache test failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestConcurrency = async () => {
    setIsLoading(true)
    try {
      console.log('Testing concurrent request handling...')
      
      const start = Date.now()
      
      // Make multiple concurrent requests
      const requests = [
        scraper.getLatestReleases(),
        scraper.getTrendingContent(),
        scraper.searchSeriesWithDetails('action'),
        scraper.searchSeriesWithDetails('romance'),
        scraper.searchSeriesWithDetails('adventure')
      ]
      
      await Promise.all(requests)
      const totalTime = Date.now() - start
      
      console.log(`5 concurrent requests completed in: ${totalTime}ms`)
      
    } catch (error) {
      console.error('Concurrency test failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearCache = async () => {
    try {
      await scraper.invalidateCache('homepage')
      await scraper.invalidateCache('search')
      console.log('Cache cleared successfully')
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatPercentage = (value: number): string => {
    return `${Math.round(value * 100)}%`
  }

  if (!stats) {
    return (
      <div className="cache-performance-demo">
        <div className="demo-header">
          <h2>Cache & Performance Monitor</h2>
          <p>Loading performance statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="cache-performance-demo">
      <div className="demo-header">
        <h2>Cache & Performance Monitor</h2>
        <p>Real-time monitoring of caching and performance optimization</p>
        {lastUpdate && (
          <p className="last-update">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="demo-controls">
        <button 
          onClick={handleTestCaching} 
          disabled={isLoading}
          className="demo-button"
        >
          {isLoading ? 'Testing...' : 'Test Cache Performance'}
        </button>
        <button 
          onClick={handleTestConcurrency} 
          disabled={isLoading}
          className="demo-button"
        >
          {isLoading ? 'Testing...' : 'Test Concurrent Requests'}
        </button>
        <button 
          onClick={handleClearCache} 
          disabled={isLoading}
          className="demo-button secondary"
        >
          Clear Cache
        </button>
      </div>

      <div className="stats-grid">
        {/* Cache Statistics */}
        <div className="stats-card">
          <h3>Cache Statistics</h3>
          <div className="stats-content">
            <div className="stat-row">
              <span className="stat-label">Memory Usage:</span>
              <span className="stat-value">
                {formatBytes(stats.cache.memoryUsage.sizeBytes)} / {formatBytes(stats.cache.memoryUsage.maxSizeBytes)}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Cache Entries:</span>
              <span className="stat-value">{stats.cache.memoryUsage.entries}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Hit Rate:</span>
              <span className="stat-value success">
                {formatPercentage(stats.cache.memoryUsage.hitRate)}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Miss Rate:</span>
              <span className="stat-value warning">
                {formatPercentage(stats.cache.memoryUsage.missRate)}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Access Time:</span>
              <span className="stat-value">
                {Math.round(stats.cache.performance.averageAccessTime)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Performance Statistics */}
        <div className="stats-card">
          <h3>Performance Metrics</h3>
          <div className="stats-content">
            <div className="stat-row">
              <span className="stat-label">Total Requests:</span>
              <span className="stat-value">{stats.performance.totalRequests}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Total Errors:</span>
              <span className="stat-value error">{stats.performance.totalErrors}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Error Rate:</span>
              <span className="stat-value error">
                {formatPercentage(stats.performance.errorRate)}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Response Time:</span>
              <span className="stat-value">
                {Math.round(stats.performance.averageResponseTime)}ms
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Requests/Second:</span>
              <span className="stat-value">
                {Math.round(stats.performance.requestsPerSecond * 100) / 100}
              </span>
            </div>
          </div>
        </div>

        {/* Queue Statistics */}
        <div className="stats-card">
          <h3>Request Queue</h3>
          <div className="stats-content">
            <div className="stat-row">
              <span className="stat-label">Active Requests:</span>
              <span className="stat-value">{stats.performance.concurrentRequests}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Queued Requests:</span>
              <span className="stat-value">{stats.performance.queuedRequests}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Queue Length:</span>
              <span className="stat-value">{stats.queue.queueLength}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Avg Wait Time:</span>
              <span className="stat-value">
                {Math.round(stats.queue.averageWaitTime)}ms
              </span>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="stats-card">
          <h3>Memory Usage</h3>
          <div className="stats-content">
            <div className="stat-row">
              <span className="stat-label">Heap Used:</span>
              <span className="stat-value">
                {formatBytes(stats.performance.memoryUsage.heapUsed)}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Heap Total:</span>
              <span className="stat-value">
                {formatBytes(stats.performance.memoryUsage.heapTotal)}
              </span>
            </div>
            <div className="stat-row">
              <span className="stat-label">External:</span>
              <span className="stat-value">
                {formatBytes(stats.performance.memoryUsage.external)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="demo-info">
        <h3>Performance Optimizations</h3>
        <ul>
          <li><strong>Intelligent Caching:</strong> Frequently accessed content is cached in memory and disk</li>
          <li><strong>Request Deduplication:</strong> Identical requests are deduplicated to reduce server load</li>
          <li><strong>Concurrent Processing:</strong> Multiple requests are handled concurrently with rate limiting</li>
          <li><strong>Cache Warming:</strong> Popular content is pre-cached for faster access</li>
          <li><strong>Image Optimization:</strong> Images are compressed and optimized for better performance</li>
          <li><strong>Adaptive Throttling:</strong> Request rate is automatically adjusted based on error rates</li>
        </ul>
      </div>
    </div>
  )
}

export default CachePerformanceDemo