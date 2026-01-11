import { ErrorHandler, ErrorContext } from './ErrorHandler'
import { ErrorType, ErrorSeverity } from '../types/errors'

// Mock winston to avoid file system operations in tests
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  })),
  format: {
    combine: jest.fn(() => jest.fn()),
    timestamp: jest.fn(() => jest.fn()),
    errors: jest.fn(() => jest.fn()),
    json: jest.fn(() => jest.fn()),
    printf: jest.fn(() => jest.fn()),
    colorize: jest.fn(() => jest.fn()),
    simple: jest.fn(() => jest.fn())
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}))

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler

  beforeEach(() => {
    errorHandler = new ErrorHandler()
  })

  describe('handleError', () => {
    it('should handle basic errors with context', async () => {
      const error = new Error('Test error')
      const context: ErrorContext = {
        operation: 'test-operation',
        url: 'https://manhwaz.com/test',
        timestamp: new Date()
      }

      const result = await errorHandler.handleError(error, context)

      expect(result).toBeDefined()
      expect(result.type).toBe(ErrorType.UNKNOWN)
      expect(result.message).toBe('Test error')
      expect(result.context?.operation).toBe('test-operation')
    })

    it('should detect network errors from status codes', async () => {
      const error = new Error('Network error')
      const context: ErrorContext = {
        operation: 'fetch-data',
        url: 'https://manhwaz.com/test',
        statusCode: 500,
        timestamp: new Date()
      }

      const result = await errorHandler.handleError(error, context)

      expect(result.type).toBe(ErrorType.NETWORK)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })

    it('should detect scraping errors from selectors', async () => {
      const error = new Error('Selector not found')
      const context: ErrorContext = {
        operation: 'extract-content',
        url: 'https://manhwaz.com/test',
        selector: '.manga-title',
        timestamp: new Date()
      }

      const result = await errorHandler.handleError(error, context)

      expect(result.type).toBe(ErrorType.SCRAPING)
      expect(result.context?.selector).toBe('.manga-title')
    })

    it('should detect structure changes from parsing errors', async () => {
      const error = new Error('cheerio selector not found')
      const context: ErrorContext = {
        operation: 'parse-content',
        url: 'https://manhwaz.com/test',
        selector: '.missing-element',
        timestamp: new Date()
      }

      // Simulate multiple failures to trigger structure change detection
      await errorHandler.handleError(error, context)
      await errorHandler.handleError(error, context)
      await errorHandler.handleError(error, context)
      
      const result = await errorHandler.handleError(error, context)

      expect(result.type).toBe(ErrorType.SCRAPING)
      expect(result.severity).toBe(ErrorSeverity.HIGH)
    })
  })

  describe('getErrorStatistics', () => {
    it('should track error frequency', async () => {
      const error = new Error('Test error')
      const context: ErrorContext = {
        operation: 'test-operation',
        timestamp: new Date()
      }

      await errorHandler.handleError(error, context)
      await errorHandler.handleError(error, context)

      const stats = errorHandler.getErrorStatistics()
      expect(stats['UNKNOWN:test-operation']).toBe(2)
    })

    it('should clear statistics', () => {
      errorHandler.clearErrorStatistics()
      const stats = errorHandler.getErrorStatistics()
      expect(Object.keys(stats)).toHaveLength(0)
    })
  })
})