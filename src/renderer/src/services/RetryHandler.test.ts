/**
 * Unit tests for RetryHandler
 * Tests exponential backoff retry mechanism
 */

import { RetryHandler, RetryConfig, defaultRetryPredicate } from './scraper/RetryHandler'
import winston from 'winston'

// Mock winston logger
const mockLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
} as unknown as winston.Logger

describe('RetryHandler', () => {
  let config: RetryConfig
  let retryHandler: RetryHandler

  beforeEach(() => {
    config = {
      maxAttempts: 3,
      baseDelay: 10, // Reduced for faster tests
      maxDelay: 100, // Reduced for faster tests
      backoffMultiplier: 2,
      jitterEnabled: false
    }
    retryHandler = new RetryHandler(config, mockLogger)
    jest.clearAllMocks()
  })

  describe('configuration validation', () => {
    it('should validate configuration on creation', () => {
      expect(() => new RetryHandler({
        maxAttempts: 0,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 2
      })).toThrow('Max attempts must be positive')

      expect(() => new RetryHandler({
        maxAttempts: 3,
        baseDelay: 0,
        maxDelay: 1000,
        backoffMultiplier: 2
      })).toThrow('Base delay must be positive')

      expect(() => new RetryHandler({
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 50,
        backoffMultiplier: 2
      })).toThrow('Max delay must be greater than or equal to base delay')

      expect(() => new RetryHandler({
        maxAttempts: 3,
        baseDelay: 100,
        maxDelay: 1000,
        backoffMultiplier: 1
      })).toThrow('Backoff multiplier must be greater than 1')
    })

    it('should update configuration correctly', () => {
      const newConfig = { maxAttempts: 5, baseDelay: 50, maxDelay: 200 }
      retryHandler.updateConfig(newConfig)

      const updatedConfig = retryHandler.getConfig()
      expect(updatedConfig.maxAttempts).toBe(5)
      expect(updatedConfig.baseDelay).toBe(50)
      expect(updatedConfig.maxDelay).toBe(200)
    })
  })

  describe('successful operations', () => {
    it('should execute operation successfully on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success')

      const result = await retryHandler.executeWithRetry(operation, 'test-operation')

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should return operation result', async () => {
      const expectedResult = { data: 'test', count: 42 }
      const operation = jest.fn().mockResolvedValue(expectedResult)

      const result = await retryHandler.executeWithRetry(operation, 'test-operation')

      expect(result).toEqual(expectedResult)
    })
  })

  describe('retry logic', () => {
    it('should retry on network errors', async () => {
      const networkError = new Error('ECONNRESET')
      const operation = jest.fn()
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockResolvedValue('success')

      const result = await retryHandler.executeWithRetry(operation, 'test-operation')

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should retry on 5xx server errors', async () => {
      const serverError = Object.assign(new Error('Server Error'), { status: 500 })
      const operation = jest.fn()
        .mockRejectedValueOnce(serverError)
        .mockResolvedValue('success')

      const result = await retryHandler.executeWithRetry(operation, 'test-operation')

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should retry on 429 rate limiting', async () => {
      const rateLimitError = Object.assign(new Error('Too Many Requests'), { status: 429 })
      const operation = jest.fn()
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValue('success')

      const result = await retryHandler.executeWithRetry(operation, 'test-operation')

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should not retry on 4xx client errors (except 429)', async () => {
      const clientError = Object.assign(new Error('Not Found'), { status: 404 })
      const operation = jest.fn().mockRejectedValue(clientError)

      await expect(retryHandler.executeWithRetry(operation, 'test-operation'))
        .rejects.toThrow('Operation \'test-operation\' failed after 3 attempts')

      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should implement exponential backoff', async () => {
      const error = new Error('ETIMEDOUT')
      const operation = jest.fn().mockRejectedValue(error)

      // Should fail after max attempts
      await expect(retryHandler.executeWithRetry(operation, 'test-operation')).rejects.toThrow()
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should cap delay at maxDelay', async () => {
      const configWithLowMax = {
        maxAttempts: 3,
        baseDelay: 10,
        maxDelay: 15, // Lower than baseDelay * backoffMultiplier^2
        backoffMultiplier: 3,
        jitterEnabled: false
      }
      const handler = new RetryHandler(configWithLowMax, mockLogger)

      const error = new Error('ECONNRESET')
      const operation = jest.fn().mockRejectedValue(error)

      await expect(handler.executeWithRetry(operation, 'test-operation')).rejects.toThrow()
      expect(operation).toHaveBeenCalledTimes(3)
    })
  })

  describe('custom retry predicate', () => {
    it('should use custom retry predicate', async () => {
      const customPredicate = jest.fn().mockReturnValue(false)
      const error = new Error('Custom error')
      const operation = jest.fn().mockRejectedValue(error)

      await expect(retryHandler.executeWithRetry(operation, 'test-operation', customPredicate))
        .rejects.toThrow()

      expect(operation).toHaveBeenCalledTimes(1)
      expect(customPredicate).toHaveBeenCalledWith(error, expect.objectContaining({
        operation: 'test-operation',
        attempt: 1,
        totalAttempts: 3
      }))
    })

    it('should pass correct context to retry predicate', async () => {
      const customPredicate = jest.fn().mockReturnValue(true)
      const error = new Error('Test error')
      const operation = jest.fn().mockRejectedValue(error)

      await expect(retryHandler.executeWithRetry(operation, 'test-op', customPredicate)).rejects.toThrow()

      // Check that predicate was called with correct context
      expect(customPredicate).toHaveBeenCalledWith(error, expect.objectContaining({
        operation: 'test-op',
        attempt: 1,
        totalAttempts: 3,
        error: error
      }))
    })
  })

  describe('error handling', () => {
    it('should throw final error after all attempts exhausted', async () => {
      const originalError = new Error('ECONNRESET') // Use a retryable error
      const operation = jest.fn().mockRejectedValue(originalError)

      await expect(retryHandler.executeWithRetry(operation, 'test-operation'))
        .rejects.toThrow('Operation \'test-operation\' failed after 3 attempts. Last error: ECONNRESET')

      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should preserve original error stack', async () => {
      const originalError = new Error('Original error')
      originalError.stack = 'Original stack trace'
      const operation = jest.fn().mockRejectedValue(originalError)

      try {
        await retryHandler.executeWithRetry(operation, 'test-operation')
      } catch (error) {
        expect((error as Error).stack).toBe('Original stack trace')
      }
    })

    it('should handle non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error')

      await expect(retryHandler.executeWithRetry(operation, 'test-operation'))
        .rejects.toThrow('Operation \'test-operation\' failed after 3 attempts. Last error: Unknown error')
    })
  })

  describe('logging', () => {
    it('should log retry attempts', async () => {
      const error = new Error('ECONNRESET')
      const operation = jest.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success')

      await retryHandler.executeWithRetry(operation, 'test-operation')

      expect(mockLogger.warn).toHaveBeenCalledWith('Operation failed', expect.objectContaining({
        operation: 'test-operation',
        attempt: 1,
        error: 'ECONNRESET'
      }))

      expect(mockLogger.info).toHaveBeenCalledWith('Retrying operation', expect.objectContaining({
        operation: 'test-operation',
        attempt: 1,
        nextAttempt: 2
      }))
    })

    it('should log final failure', async () => {
      const error = new Error('ECONNRESET') // Use a retryable error
      const operation = jest.fn().mockRejectedValue(error)

      await expect(retryHandler.executeWithRetry(operation, 'test-operation')).rejects.toThrow()

      expect(mockLogger.error).toHaveBeenCalledWith('All retry attempts exhausted', expect.objectContaining({
        operation: 'test-operation',
        totalAttempts: 3
      }))
    })
  })
})

describe('defaultRetryPredicate', () => {
  const mockContext = {
    operation: 'test',
    attempt: 1,
    totalAttempts: 3,
    delay: 100
  }

  it('should retry on network errors', () => {
    expect(defaultRetryPredicate(new Error('ECONNRESET'), mockContext)).toBe(true)
    expect(defaultRetryPredicate(new Error('ETIMEDOUT'), mockContext)).toBe(true)
    expect(defaultRetryPredicate(new Error('ENOTFOUND'), mockContext)).toBe(true)
  })

  it('should retry on 5xx status codes', () => {
    const serverError = Object.assign(new Error('Server Error'), { status: 500 })
    expect(defaultRetryPredicate(serverError, mockContext)).toBe(true)

    const badGateway = Object.assign(new Error('Bad Gateway'), { status: 502 })
    expect(defaultRetryPredicate(badGateway, mockContext)).toBe(true)
  })

  it('should retry on 429 rate limiting', () => {
    const rateLimitError = Object.assign(new Error('Too Many Requests'), { status: 429 })
    expect(defaultRetryPredicate(rateLimitError, mockContext)).toBe(true)
  })

  it('should not retry on 4xx client errors (except 429)', () => {
    const notFound = Object.assign(new Error('Not Found'), { status: 404 })
    expect(defaultRetryPredicate(notFound, mockContext)).toBe(false)

    const unauthorized = Object.assign(new Error('Unauthorized'), { status: 401 })
    expect(defaultRetryPredicate(unauthorized, mockContext)).toBe(false)
  })

  it('should not retry on final attempt', () => {
    const finalAttemptContext = { ...mockContext, attempt: 3 }
    const error = new Error('ECONNRESET')
    expect(defaultRetryPredicate(error, finalAttemptContext)).toBe(false)
  })

  it('should not retry on unknown errors', () => {
    const unknownError = new Error('Unknown error')
    expect(defaultRetryPredicate(unknownError, mockContext)).toBe(false)
  })
})