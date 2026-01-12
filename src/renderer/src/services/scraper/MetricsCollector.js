"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metricsCollector = exports.MetricsCollector = void 0;
const Logger_1 = require("./Logger");
/**
 * Comprehensive metrics collection service
 * Implements requirements 8.4, 8.5 for response times and success rates
 */
class MetricsCollector {
    constructor(operationLogger, errorHandler) {
        this.scrapingMetrics = [];
        this.maxMetricsHistory = 10000;
        this.metricsAggregationInterval = null;
        this.operationLogger = operationLogger;
        this.errorHandler = errorHandler;
        this.logger = Logger_1.Logger.create('metrics-collector');
        // Start periodic metrics aggregation
        this.startMetricsAggregation();
    }
    /**
     * Record scraping operation metrics
     * Requirement 8.4: Response time collection
     */
    recordScrapingMetrics(metrics) {
        const scrapingMetric = {
            ...metrics,
            timestamp: new Date()
        };
        this.scrapingMetrics.push(scrapingMetric);
        // Maintain history size
        if (this.scrapingMetrics.length > this.maxMetricsHistory) {
            this.scrapingMetrics = this.scrapingMetrics.slice(-this.maxMetricsHistory);
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
        });
        // Log performance warnings
        if (metrics.responseTime > 5000) {
            this.logger.warn('Slow scraping operation detected', {
                url: metrics.url,
                operation: metrics.operation,
                responseTime: metrics.responseTime
            });
        }
        if (!metrics.success) {
            this.logger.warn('Failed scraping operation', {
                url: metrics.url,
                operation: metrics.operation,
                errorType: metrics.errorType,
                statusCode: metrics.statusCode,
                retryCount: metrics.retryCount
            });
        }
    }
    /**
     * Get aggregated metrics for a time window
     * Requirement 8.5: Success rate calculation
     */
    getAggregatedMetrics(timeWindowMinutes = 60) {
        const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
        const recentMetrics = this.scrapingMetrics.filter(metric => metric.timestamp >= cutoffTime);
        const totalRequests = recentMetrics.length;
        const successfulRequests = recentMetrics.filter(m => m.success).length;
        const failedRequests = totalRequests - successfulRequests;
        const averageResponseTime = totalRequests > 0
            ? recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests
            : 0;
        // Group errors by type
        const errorsByType = {};
        recentMetrics
            .filter(m => !m.success && m.errorType)
            .forEach(m => {
            errorsByType[m.errorType] = (errorsByType[m.errorType] || 0) + 1;
        });
        // Find slowest operations
        const slowestOperations = recentMetrics
            .sort((a, b) => b.responseTime - a.responseTime)
            .slice(0, 5)
            .map(m => ({
            operation: m.operation,
            url: m.url,
            responseTime: m.responseTime
        }));
        // Find fastest operations
        const fastestOperations = recentMetrics
            .filter(m => m.success)
            .sort((a, b) => a.responseTime - b.responseTime)
            .slice(0, 5)
            .map(m => ({
            operation: m.operation,
            url: m.url,
            responseTime: m.responseTime
        }));
        return {
            timeWindow: `${timeWindowMinutes} minutes`,
            totalRequests,
            successfulRequests,
            failedRequests,
            averageResponseTime,
            errorsByType,
            slowestOperations,
            fastestOperations
        };
    }
    /**
     * Get success rate for specific operation type
     */
    getSuccessRate(operation, timeWindowMinutes = 60) {
        const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
        let relevantMetrics = this.scrapingMetrics.filter(metric => metric.timestamp >= cutoffTime);
        if (operation) {
            relevantMetrics = relevantMetrics.filter(m => m.operation === operation);
        }
        if (relevantMetrics.length === 0) {
            return 0;
        }
        const successfulRequests = relevantMetrics.filter(m => m.success).length;
        return (successfulRequests / relevantMetrics.length) * 100;
    }
    /**
     * Get average response time for specific operation type
     */
    getAverageResponseTime(operation, timeWindowMinutes = 60) {
        const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
        let relevantMetrics = this.scrapingMetrics.filter(metric => metric.timestamp >= cutoffTime && metric.success);
        if (operation) {
            relevantMetrics = relevantMetrics.filter(m => m.operation === operation);
        }
        if (relevantMetrics.length === 0) {
            return 0;
        }
        const totalResponseTime = relevantMetrics.reduce((sum, m) => sum + m.responseTime, 0);
        return totalResponseTime / relevantMetrics.length;
    }
    /**
     * Get error distribution
     */
    getErrorDistribution(timeWindowMinutes = 60) {
        const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
        const failedMetrics = this.scrapingMetrics.filter(metric => metric.timestamp >= cutoffTime && !metric.success && metric.errorType);
        const distribution = {};
        failedMetrics.forEach(metric => {
            distribution[metric.errorType] = (distribution[metric.errorType] || 0) + 1;
        });
        return distribution;
    }
    /**
     * Generate comprehensive metrics report
     */
    generateMetricsReport() {
        const summary = this.getAggregatedMetrics(60);
        const performanceMetrics = this.operationLogger.getPerformanceMetrics();
        const errorStatistics = this.errorHandler.getErrorStatistics();
        const operationSummary = this.operationLogger.getOperationSummary();
        const systemHealth = {
            overallSuccessRate: operationSummary.successRate,
            averageResponseTime: operationSummary.averageResponseTime,
            errorRate: 100 - operationSummary.successRate,
            activeOperations: operationSummary.activeOperations
        };
        return {
            summary,
            performanceMetrics,
            errorStatistics,
            systemHealth
        };
    }
    /**
     * Start periodic metrics aggregation and logging
     */
    startMetricsAggregation() {
        // Log aggregated metrics every 5 minutes
        this.metricsAggregationInterval = setInterval(() => {
            const report = this.generateMetricsReport();
            this.logger.info('Periodic metrics report', {
                timestamp: new Date().toISOString(),
                report
            });
            // Log system health warnings
            if (report.systemHealth.overallSuccessRate < 90) {
                this.logger.warn('Low system success rate detected', {
                    successRate: report.systemHealth.overallSuccessRate,
                    errorRate: report.systemHealth.errorRate
                });
            }
            if (report.systemHealth.averageResponseTime > 3000) {
                this.logger.warn('High average response time detected', {
                    averageResponseTime: report.systemHealth.averageResponseTime
                });
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
    /**
     * Stop metrics aggregation
     */
    stopMetricsAggregation() {
        if (this.metricsAggregationInterval) {
            clearInterval(this.metricsAggregationInterval);
            this.metricsAggregationInterval = null;
        }
    }
    /**
     * Clear metrics history
     */
    clearMetrics() {
        this.scrapingMetrics = [];
        this.logger.info('Metrics history cleared');
    }
    /**
     * Export metrics data for analysis
     */
    exportMetrics() {
        return {
            scrapingMetrics: [...this.scrapingMetrics],
            aggregatedMetrics: this.getAggregatedMetrics(),
            performanceMetrics: this.operationLogger.getPerformanceMetrics()
        };
    }
}
exports.MetricsCollector = MetricsCollector;
// Create singleton instance
const OperationLogger_1 = require("./OperationLogger");
const ErrorHandler_1 = require("./ErrorHandler");
exports.metricsCollector = new MetricsCollector(OperationLogger_1.operationLogger, ErrorHandler_1.errorHandler);
//# sourceMappingURL=MetricsCollector.js.map