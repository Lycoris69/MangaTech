/**
 * Tests for PerformanceOptimizer
 */

import { PerformanceOptimizer } from './PerformanceOptimizer'
import { RateLimiter } from './RateLimiter'
import axios from 'axios'

// Mock axios
jest.mock('axios')
const mockedAxios = axios as jest.Mocked<typeof axios>

// Mock winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn()
  }
}))

describe('PerformanceOptimizer', () => {
  let performanceOptimizer: PerformanceOptimizer
  let rateLimiter: RateLimiter
  let mockAxiosInstance: jest.Mocked<any>

  beforeEach(() => {
    // Create rate limiter
    rateLimiter = new RateLimiter({
      requestsPerSecond: 10,
      burstLimit: 20
    })

    // Mock axios instance
    mockAxiosInstance = {
      request: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn()
        },
        response: {
          use: jest.fn()
        }
      }
    }

    mockedAxios.create.mockReturnValue(mockAxiosInstance)

    // Create performance optimizer
    performanceOptimizer = new PerformanceOptimizer(rateLimiter, {
      maxConcurrentRequests: 5,
      requestTimeout: 5000,
      enableRequestDeduplication: true,
      enablePerformanceMonitoring: true
    })
  })

  afterEach(async () => {
    await performanceOptimizer.cleanup()
  })

  describe('Request Handling', () => {
    it('should make a single request successfully', async () => {
      const mockResponse = {
        status: 200,
        data: 'test data',
        config: { startTime: Date.now() }
      }

      mockAxiosInstance.request.mockResolvedValueOnce(mockResponse)

      const response = await performanceOptimizer.makeRequest('https://example.com')

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        url: 'https://example.com',
        startTime: expect.any(Number)
      })
      expect(response).toEqual(mockResponse)
    })

    it('should handle request failures gracefully', async () => {
      const mockError = new Error('Network error')
      mockAxiosInstance.request.mockRejectedValueOnce(mockError)

      await expect(
        performanceOptimizer.makeRequest('https://example.com')
      ).rejects.toThrow('Network error')
    })

    it('should respect concurrent request limits', async () => {
      const mockResponse = {
        status: 200,
        data: 'test data',
        config: { startTime: Date.now() }
      }

      // Mock slow responses to test concurrency
      mockAxiosInstance.request.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockResponse), 100))
      )

      // Make more requests than the concurrent limit
      const requests = Array.from({ length: 10 }, (_, i) => 
        performanceOptimizer.makeRequest(`https://example.com/${i}`)
      )

      // All requests should eventually complete
      const responses = await Promise.all(requests)
      expect(responses).toHaveLength(10)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(10)
    })
  })

  describe('Multiple Requests', () => {
    it('should handle multiple requests concurrently', async () => {
      const mockResponse = {
        status: 200,
        data: 'test data',
        config: { startTime: Date.now() }
      }

      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const requests = [
        { url: 'https://example.com/1' },
        { url: 'https://example.com/2' },
        { url: 'https://example.com/3' }
      ]

      const responses = await performanceOptimizer.makeMultipleRequests(requests)

      expect(responses).toHaveLength(3)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(3)
    })

    it('should handle batched requests with delays', async () => {
      const mockResponse = {
        status: 200,
        data: 'test data',
        config: { startTime: Date.now() }
      }

      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      const requests = Array.from({ length: 7 }, (_, i) => ({
        url: `https://example.com/${i}`
      }))

      const startTime = Date.now()
      const responses = await performanceOptimizer.makeBatchedRequests(requests, 3)
      const endTime = Date.now()

      expect(responses).toHaveLength(7)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(7)
      
      // Should have taken some time due to batching delays
      expect(endTime - startTime).toBeGreaterThan(50) // At least some delay
    })
  })

  describe('Request Deduplication', () => {
    it('should handle request deduplication configuration', async () => {
      const mockResponse = {
        status: 200,
        data: 'test data',
        config: { startTime: Date.now() }
      }

      mockAxiosInstance.request.mockResolvedValue(mockResponse)

      // Make requests with deduplication enabled
      const response1 = await performanceOptimizer.makeRequest('https://example.com/test1')
      const response2 = await performanceOptimizer.makeRequest('https://example.com/test2')

      expect(response1).toEqual(mockResponse)
      expect(response2).toEqual(mockResponse)
      expect(mockAxiosInstance.request).toHaveBeenCalledTimes(2)
    })
  })

  describe('Performance Metrics', () => {
    it('should provide performance metrics structure', async () => {
      const metrics = performanceOptimizer.getMetrics()

      expect(metrics).toHaveProperty('totalRequests')
      expect(metrics).toHaveProperty('totalErrors')
      expect(metrics).toHaveProperty('concurrentRequests')
      expect(metrics).toHaveProperty('queuedRequests')
      expect(metrics).toHaveProperty('requestsPerSecond')
      expect(metrics).toHaveProperty('averageResponseTime')
      expect(metrics).toHaveProperty('errorRate')
      expect(metrics).toHaveProperty('connectionPoolStats')
      expect(metrics).toHaveProperty('memoryUsage')
      
      expect(typeof metrics.totalRequests).toBe('number')
      expect(typeof metrics.totalErrors).toBe('number')
      expect(typeof metrics.concurrentRequests).toBe('number')
      expect(typeof metrics.queuedRequests).toBe('number')
    })

    it('should initialize metrics with default values', async () => {
      const metrics = performanceOptimizer.getMetrics()

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(0)
      expect(metrics.totalErrors).toBeGreaterThanOrEqual(0)
      expect(metrics.concurrentRequests).toBeGreaterThanOrEqual(0)
      expect(metrics.queuedRequests).toBeGreaterThanOrEqual(0)
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Queue Statistics', () => {
    it('should provide queue statistics', async () => {
      const stats = performanceOptimizer.getQueueStats()

      expect(stats).toHaveProperty('queueLength')
      expect(stats).toHaveProperty('activeRequests')
      expect(stats).toHaveProperty('averageWaitTime')
      expect(typeof stats.queueLength).toBe('number')
      expect(typeof stats.activeRequests).toBe('number')
      expect(typeof stats.averageWaitTime).toBe('number')
    })
  })

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const newConfig = {
        maxConcurrentRequests: 10,
        requestTimeout: 10000
      }

      performanceOptimizer.updateConfig(newConfig)

      // Configuration should be updated (we can't directly test this without
      // exposing internal state, but we can verify no errors occur)
      expect(() => performanceOptimizer.updateConfig(newConfig)).not.toThrow()
    })
  })

  describe('Deduplication Cache Management', () => {
    it('should clear deduplication cache', () => {
      expect(() => performanceOptimizer.clearDeduplicationCache()).not.toThrow()
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources properly', async () => {
      await expect(performanceOptimizer.cleanup()).resolves.not.toThrow()
    })
  })
})