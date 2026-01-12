import { OperationLogger, PerformanceMetrics } from './OperationLogger';
import { ErrorHandler } from './ErrorHandler';
export interface ScrapingMetrics {
    url: string;
    operation: string;
    responseTime: number;
    statusCode?: number;
    success: boolean;
    errorType?: string;
    retryCount?: number;
    timestamp: Date;
}
export interface AggregatedMetrics {
    timeWindow: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    errorsByType: Record<string, number>;
    slowestOperations: Array<{
        operation: string;
        url: string;
        responseTime: number;
    }>;
    fastestOperations: Array<{
        operation: string;
        url: string;
        responseTime: number;
    }>;
}
/**
 * Comprehensive metrics collection service
 * Implements requirements 8.4, 8.5 for response times and success rates
 */
export declare class MetricsCollector {
    private logger;
    private operationLogger;
    private errorHandler;
    private scrapingMetrics;
    private maxMetricsHistory;
    private metricsAggregationInterval;
    constructor(operationLogger: OperationLogger, errorHandler: ErrorHandler);
    /**
     * Record scraping operation metrics
     * Requirement 8.4: Response time collection
     */
    recordScrapingMetrics(metrics: Omit<ScrapingMetrics, 'timestamp'>): void;
    /**
     * Get aggregated metrics for a time window
     * Requirement 8.5: Success rate calculation
     */
    getAggregatedMetrics(timeWindowMinutes?: number): AggregatedMetrics;
    /**
     * Get success rate for specific operation type
     */
    getSuccessRate(operation?: string, timeWindowMinutes?: number): number;
    /**
     * Get average response time for specific operation type
     */
    getAverageResponseTime(operation?: string, timeWindowMinutes?: number): number;
    /**
     * Get error distribution
     */
    getErrorDistribution(timeWindowMinutes?: number): Record<string, number>;
    /**
     * Generate comprehensive metrics report
     */
    generateMetricsReport(): {
        summary: AggregatedMetrics;
        performanceMetrics: PerformanceMetrics[];
        errorStatistics: Record<string, number>;
        systemHealth: {
            overallSuccessRate: number;
            averageResponseTime: number;
            errorRate: number;
            activeOperations: number;
        };
    };
    /**
     * Start periodic metrics aggregation and logging
     */
    private startMetricsAggregation;
    /**
     * Stop metrics aggregation
     */
    stopMetricsAggregation(): void;
    /**
     * Clear metrics history
     */
    clearMetrics(): void;
    /**
     * Export metrics data for analysis
     */
    exportMetrics(): {
        scrapingMetrics: ScrapingMetrics[];
        aggregatedMetrics: AggregatedMetrics;
        performanceMetrics: PerformanceMetrics[];
    };
}
export declare const metricsCollector: MetricsCollector;
//# sourceMappingURL=MetricsCollector.d.ts.map