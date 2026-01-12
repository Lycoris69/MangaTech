"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.operationLogger = exports.OperationLogger = void 0;
const Logger_1 = require("./Logger");
/**
 * OperationLogger - Logs and tracks scraping operations
 *
 * Provides:
 * - Start/End operation tracking
 * - Performance metrics collection
 * - Historical operation log
 */
class OperationLogger {
    constructor(maxHistorySize = 1000) {
        this.activeOperations = new Map();
        this.operationHistory = [];
        this.performanceMetrics = [];
        this.maxHistorySize = maxHistorySize;
        // Initialize logger
        if (!OperationLogger.logger) {
            OperationLogger.logger = Logger_1.Logger.create('operation-logger');
        }
    }
    /**
     * Start a new operation context
     */
    startOperation(name, context = {}) {
        const id = this.generateOperationId();
        const operation = {
            id,
            name,
            startTime: Date.now(),
            context
        };
        this.activeOperations.set(id, operation);
        OperationLogger.logger.debug(`Started operation: ${name}`, { id, ...context });
        return id;
    }
    /**
     * End an operation context
     */
    endOperation(id, success, context = {}) {
        const operation = this.activeOperations.get(id);
        if (!operation) {
            OperationLogger.logger.warn(`Attempted to end unknown operation: ${id}`);
            return;
        }
        const endTime = Date.now();
        const duration = endTime - operation.startTime;
        // Update operation record
        operation.endTime = endTime;
        operation.duration = duration;
        operation.success = success;
        operation.context = { ...operation.context, ...context };
        // Move to history
        this.operationHistory.push(operation);
        if (this.operationHistory.length > this.maxHistorySize) {
            this.operationHistory.shift(); // Maintain history size
        }
        this.activeOperations.delete(id);
        // Log result
        const level = success ? 'debug' : 'error';
        OperationLogger.logger[level](`Ended operation: ${operation.name}`, {
            id,
            success,
            duration,
            ...context
        });
    }
    /**
     * Get history of operations
     */
    getOperationHistory(limit = 100) {
        return this.operationHistory.slice(-limit);
    }
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics() {
        // This would typically aggregate data from internal state
        // For now returning empty array as placeholder if not explicitly populated
        return this.performanceMetrics;
    }
    /**
   * Get summary of current operations
   */
    getOperationSummary() {
        const totalOps = this.operationHistory.length;
        if (totalOps === 0) {
            return {
                successRate: 100,
                averageResponseTime: 0,
                activeOperations: this.activeOperations.size,
                totalOperations: 0
            };
        }
        const successfulOps = this.operationHistory.filter(op => op.success).length;
        const totalDuration = this.operationHistory.reduce((sum, op) => sum + (op.duration || 0), 0);
        return {
            successRate: (successfulOps / totalOps) * 100,
            averageResponseTime: totalDuration / totalOps,
            activeOperations: this.activeOperations.size,
            totalOperations: totalOps
        };
    }
    generateOperationId() {
        return `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
exports.OperationLogger = OperationLogger;
exports.operationLogger = new OperationLogger();
//# sourceMappingURL=OperationLogger.js.map