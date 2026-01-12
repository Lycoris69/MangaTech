import { ErrorHandler } from './ErrorHandler';
import { OperationLogger } from './OperationLogger';
import { MetricsCollector } from './MetricsCollector';
export interface MonitoredOperation<T> {
    operationName: string;
    url?: string;
    selector?: string;
    execute: () => Promise<T>;
}
export interface MonitoringResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    metrics: {
        operationId: string;
        duration: number;
        responseTime: number;
        retryCount: number;
    };
}
/**
 * Unified monitoring service for scraping operations
 * Integrates error handling, logging, and metrics collection
 */
export declare class ScrapingMonitor {
    private errorHandler;
    private operationLogger;
    private metricsCollector;
    constructor(errorHandler: ErrorHandler, operationLogger: OperationLogger, metricsCollector: MetricsCollector);
    /**
     * Execute a monitored scraping operation with comprehensive logging and error handling
     */
    executeMonitored<T>(operation: MonitoredOperation<T>, retryCount?: number): Promise<MonitoringResult<T>>;
    /**
     * Execute operation with automatic retry logic
     */
    executeWithRetry<T>(operation: MonitoredOperation<T>, maxRetries?: number, retryDelay?: number): Promise<MonitoringResult<T>>;
    /**
     * Monitor multiple operations concurrently
     */
    executeMultipleMonitored<T>(operations: MonitoredOperation<T>[], concurrency?: number): Promise<MonitoringResult<T>[]>;
    /**
     * Get monitoring statistics
     */
    getMonitoringStats(): {
        errorStats: Record<string, number>;
        performanceMetrics: any[];
        systemHealth: any;
    };
    /**
     * Check system health
     */
    checkSystemHealth(): {
        healthy: boolean;
        issues: string[];
        metrics: {
            successRate: number;
            averageResponseTime: number;
            errorRate: number;
            activeOperations: number;
        };
    };
    /**
     * Generate comprehensive monitoring report
     */
    generateReport(): {
        timestamp: string;
        systemHealth: any;
        recentErrors: any[];
        performanceMetrics: any[];
        recommendations: string[];
    };
}
export declare const scrapingMonitor: ScrapingMonitor;
//# sourceMappingURL=ScrapingMonitor.d.ts.map