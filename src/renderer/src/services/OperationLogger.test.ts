import { OperationLogger } from './scraper/OperationLogger'

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

describe('OperationLogger', () => {
  let operationLogger: OperationLogger

  beforeEach(() => {
    operationLogger = new OperationLogger()
  })

  describe('operation tracking', () => {
    it('should start and end operations successfully', () => {
      const operationId = operationLogger.startOperation('test-operation', {
        url: 'https://manhwaz.com/test'
      })

      expect(operationId).toBeDefined()
      expect(operationId).toMatch(/^op-\d+-[a-z0-9]+$/)

      const activeOps = operationLogger.getActiveOperations()
      expect(activeOps).toHaveLength(1)
      expect(activeOps[0].operationName).toBe('test-operation')

      operationLogger.endOperation(operationId, true, {
        statusCode: 200,
        responseSize: 1024
      })

      const activeOpsAfter = operationLogger.getActiveOperations()
      expect(activeOpsAfter).toHaveLength(0)

      const history = operationLogger.getOperationHistory(10)
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].duration).toBeDefined()
    })

    it('should track failed operations', () => {
      const operationId = operationLogger.startOperation('failing-operation')

      operationLogger.endOperation(operationId, false, {
        errorMessage: 'Operation failed'
      })

      const history = operationLogger.getOperationHistory(10)
      expect(history[0].success).toBe(false)
      expect(history[0].errorMessage).toBe('Operation failed')
    })

    it('should log operation progress', () => {
      const operationId = operationLogger.startOperation('long-operation')

      operationLogger.logProgress(operationId, {
        step: 'processing',
        percentage: 50,
        itemsProcessed: 5,
        totalItems: 10
      })

      // Should not throw and operation should still be active
      const activeOps = operationLogger.getActiveOperations()
      expect(activeOps).toHaveLength(1)
    })
  })

  describe('performance metrics', () => {
    it('should calculate performance metrics', () => {
      const operationId1 = operationLogger.startOperation('fast-operation')
      operationLogger.endOperation(operationId1, true, { responseSize: 500 })

      const operationId2 = operationLogger.startOperation('fast-operation')
      operationLogger.endOperation(operationId2, false, { errorMessage: 'Failed' })

      const metrics = operationLogger.getPerformanceMetrics('fast-operation')
      expect(metrics).toHaveLength(1)
      expect(metrics[0].operation).toBe('fast-operation')
      expect(metrics[0].totalRequests).toBe(2)
      expect(metrics[0].successfulRequests).toBe(1)
      expect(metrics[0].failedRequests).toBe(1)
      expect(metrics[0].successRate).toBe(50)
    })

    it('should provide operation summary', () => {
      const operationId = operationLogger.startOperation('summary-test')
      operationLogger.endOperation(operationId, true)

      const summary = operationLogger.getOperationSummary()
      expect(summary.totalOperations).toBe(1)
      expect(summary.activeOperations).toBe(0)
      expect(summary.successRate).toBe(100)
      expect(summary.operationsByType['summary-test']).toBe(1)
    })
  })

  describe('history management', () => {
    it('should clear history and metrics', () => {
      const operationId = operationLogger.startOperation('test-clear')
      operationLogger.endOperation(operationId, true)

      operationLogger.clearHistory()

      const history = operationLogger.getOperationHistory()
      expect(history).toHaveLength(0)

      const metrics = operationLogger.getPerformanceMetrics()
      expect(metrics).toHaveLength(0)
    })
  })
})