"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrapingMonitor = exports.ScrapingMonitor = void 0;
const ErrorHandler_1 = require("./ErrorHandler");
const OperationLogger_1 = require("./OperationLogger");
const MetricsCollector_1 = require("./MetricsCollector");
/**
 * Unified monitoring service for scraping operations
 * Integrates error handling, logging, and metrics collection
 */
class ScrapingMonitor {
    constructor(errorHandler, operationLogger, metricsCollector) {
        this.errorHandler = errorHandler;
        this.operationLogger = operationLogger;
        this.metricsCollector = metricsCollector;
    }
    /**
     * Execute a monitored scraping operation with comprehensive logging and error handling
     */
    async executeMonitored(operation, retryCount = 0) {
        const operationId = this.operationLogger.startOperation(operation.operationName, {
            url: operation.url,
            selector: operation.selector,
            retryCount
        });
        const startTime = Date.now();
        let result;
        let error;
        let success = false;
        try {
            // Execute the operation
            result = await operation.execute();
            success = true;
            // Log successful completion
            const duration = Date.now() - startTime;
            this.operationLogger.endOperation(operationId, true, {
                url: operation.url,
                statusCode: 200,
                retryCount
            });
            // Record metrics
            this.metricsCollector.recordScrapingMetrics({
                url: operation.url || 'unknown',
                operation: operation.operationName,
                responseTime: duration,
                statusCode: 200,
                success: true,
                retryCount
            });
            return {
                success: true,
                result,
                metrics: {
                    operationId,
                    duration,
                    responseTime: duration,
                    retryCount
                }
            };
        }
        catch (err) {
            error = err instanceof Error ? err : new Error(String(err));
            const duration = Date.now() - startTime;
            // Create error context
            const errorContext = {
                operation: operation.operationName,
                url: operation.url,
                selector: operation.selector,
                responseTime: duration,
                retryCount,
                timestamp: new Date()
            };
            // Handle error with comprehensive logging
            const appError = await this.errorHandler.handleError(error, errorContext);
            // Log failed operation
            this.operationLogger.endOperation(operationId, false, {
                url: operation.url,
                retryCount,
                errorMessage: error.message
            });
            // Record failure metrics
            this.metricsCollector.recordScrapingMetrics({
                url: operation.url || 'unknown',
                operation: operation.operationName,
                responseTime: duration,
                success: false,
                errorType: appError.type,
                retryCount
            });
            return {
                success: false,
                error,
                metrics: {
                    operationId,
                    duration,
                    responseTime: duration,
                    retryCount
                }
            };
        }
    }
    /**
     * Execute operation with automatic retry logic
     */
    async executeWithRetry(operation, maxRetries = 3, retryDelay = 1000) {
        let lastResult = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            lastResult = await this.executeMonitored(operation, attempt);
            if (lastResult.success) {
                return lastResult;
            }
            // Don't retry on the last attempt
            if (attempt < maxRetries) {
                // Calculate exponential backoff delay
                const delay = retryDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return lastResult;
    }
    /**
     * Monitor multiple operations concurrently
     */
    async executeMultipleMonitored(operations, concurrency = 3) {
        const results = [];
        // Process operations in batches to respect concurrency limit
        for (let i = 0; i < operations.length; i += concurrency) {
            const batch = operations.slice(i, i + concurrency);
            const batchPromises = batch.map(op => this.executeMonitored(op));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Get monitoring statistics
     */
    getMonitoringStats() {
        const report = this.metricsCollector.generateMetricsReport();
        return {
            errorStats: this.errorHandler.getErrorStatistics(),
            performanceMetrics: report.performanceMetrics,
            systemHealth: report.systemHealth
        };
    }
    /**
     * Check system health
     */
    checkSystemHealth() {
        const report = this.metricsCollector.generateMetricsReport();
        const health = report.systemHealth;
        const issues = [];
        let healthy = true;
        // Check success rate
        if (health.overallSuccessRate < 90) {
            issues.push(`Low success rate: ${health.overallSuccessRate.toFixed(1)}%`);
            healthy = false;
        }
        // Check response time
        if (health.averageResponseTime > 5000) {
            issues.push(`High response time: ${health.averageResponseTime.toFixed(0)}ms`);
            healthy = false;
        }
        // Check error rate
        if (health.errorRate > 10) {
            issues.push(`High error rate: ${health.errorRate.toFixed(1)}%`);
            healthy = false;
        }
        // Check for too many active operations (potential hanging)
        if (health.activeOperations > 10) {
            issues.push(`Too many active operations: ${health.activeOperations}`);
            healthy = false;
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
        };
    }
    /**
     * Generate comprehensive monitoring report
     */
    generateReport() {
        const report = this.metricsCollector.generateMetricsReport();
        const health = this.checkSystemHealth();
        const recentOperations = this.operationLogger.getOperationHistory(50);
        const recentErrors = recentOperations.filter(op => !op.success);
        const recommendations = [];
        // Generate recommendations based on metrics
        if (health.metrics.successRate < 95) {
            recommendations.push('Consider implementing additional error recovery strategies');
        }
        if (health.metrics.averageResponseTime > 3000) {
            recommendations.push('Optimize scraping operations or implement caching');
        }
        if (recentErrors.length > 5) {
            recommendations.push('Investigate recent error patterns for potential fixes');
        }
        if (health.metrics.activeOperations > 5) {
            recommendations.push('Monitor for hanging operations and implement timeouts');
        }
        return {
            timestamp: new Date().toISOString(),
            systemHealth: report.systemHealth,
            recentErrors: recentErrors.slice(0, 10),
            performanceMetrics: report.performanceMetrics,
            recommendations
        };
    }
}
exports.ScrapingMonitor = ScrapingMonitor;
// Create singleton instance
exports.scrapingMonitor = new ScrapingMonitor(ErrorHandler_1.errorHandler, OperationLogger_1.operationLogger, MetricsCollector_1.metricsCollector);
//# sourceMappingURL=ScrapingMonitor.js.map