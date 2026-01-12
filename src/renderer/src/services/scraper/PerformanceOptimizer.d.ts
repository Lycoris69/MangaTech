/**
 * PerformanceOptimizer - Concurrent request handling and performance optimization
 *
 * Provides:
 * - Concurrent request batching and throttling
 * - Request deduplication to prevent duplicate requests
 * - Connection pooling and reuse
 * - Performance monitoring and adaptive optimization
 * - Resource usage optimization
 *
 * Requirements: Performance optimization for all requirements
 */
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { RateLimiter } from './RateLimiter';
export interface PerformanceConfig {
    maxConcurrentRequests: number;
    requestTimeout: number;
    connectionPoolSize: number;
    keepAliveTimeout: number;
    enableRequestDeduplication: boolean;
    enableConnectionReuse: boolean;
    enablePerformanceMonitoring: boolean;
    adaptiveThrottling: boolean;
    batchSize: number;
    batchDelay: number;
}
interface BatchConfig {
    maxBatchSize: number;
    maxWaitTime: number;
    enableBatching: boolean;
}
export interface PerformanceMetrics {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
    concurrentRequests: number;
    queuedRequests: number;
    totalRequests: number;
    totalErrors: number;
    connectionPoolStats: {
        active: number;
        idle: number;
        total: number;
    };
    memoryUsage: {
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
}
/**
 * Performance optimizer for concurrent request handling
 */
export declare class PerformanceOptimizer {
    private static logger;
    private config;
    private batchConfig;
    private axiosInstance;
    private rateLimiter;
    private requestQueue;
    private activeRequests;
    private deduplicationCache;
    private metrics;
    private metricsTimer?;
    private batchTimer?;
    private isProcessing;
    constructor(rateLimiter: RateLimiter, config?: Partial<PerformanceConfig>, batchConfig?: Partial<BatchConfig>);
    /**
     * Make an optimized HTTP request
     */
    makeRequest(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse>;
    /**
     * Make multiple requests concurrently with optimization
     */
    makeMultipleRequests(requests: Array<{
        url: string;
        config?: AxiosRequestConfig;
    }>): Promise<AxiosResponse[]>;
    /**
     * Make requests in batches to control concurrency
     */
    makeBatchedRequests(requests: Array<{
        url: string;
        config?: AxiosRequestConfig;
    }>, batchSize?: number): Promise<AxiosResponse[]>;
    /**
     * Get current performance metrics
     */
    getMetrics(): PerformanceMetrics;
    /**
     * Update performance configuration
     */
    updateConfig(newConfig: Partial<PerformanceConfig>): void;
    /**
     * Clear request deduplication cache
     */
    clearDeduplicationCache(): void;
    /**
     * Get queue statistics
     */
    getQueueStats(): {
        queueLength: number;
        activeRequests: number;
        averageWaitTime: number;
    };
    /**
     * Create optimized axios instance
     */
    private createOptimizedAxiosInstance;
    /**
     * Start request processing loop
     */
    private startRequestProcessing;
    /**
     * Process queued requests
     */
    private processRequestQueue;
    /**
     * Process individual request
     */
    private processRequest;
    /**
     * Generate unique request ID for deduplication
     */
    private generateRequestId;
    /**
     * Update response time metrics
     */
    private updateResponseTimeMetrics;
    /**
     * Update error rate metrics
     */
    private updateErrorRate;
    /**
     * Start performance monitoring
     */
    private startPerformanceMonitoring;
    /**
     * Update performance metrics
     */
    private updatePerformanceMetrics;
    /**
     * Clean up old deduplication cache entries
     */
    private cleanupDeduplicationCache;
    /**
     * Utility method for creating delays
     */
    private delay;
    /**
     * Build search index for series (for testing purposes)
     */
    buildSearchIndex(series: any[]): void;
    /**
     * Search series by query (for testing purposes)
     */
    searchSeries(query: string, series: any[]): any[];
    /**
     * Sort series by field (for testing purposes)
     */
    sortSeries(series: any[], field: string): any[];
    /**
     * Paginate results (for testing purposes)
     */
    paginateResults(series: any[], page: number, pageSize: number): {
        items: any[];
        total: number;
        page: number;
        pageSize: number;
    };
    /**
     * Cache series data (for testing purposes)
     */
    cacheSeries(series: any[]): void;
    /**
     * Clear caches (for testing purposes)
     */
    clearCaches(): void;
    /**
     * Get memory usage (for testing purposes)
     */
    getMemoryUsage(): {
        heapUsed: number;
        heapTotal: number;
        external: number;
        cacheSize?: number;
        indexSize?: number;
    };
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
export {};
//# sourceMappingURL=PerformanceOptimizer.d.ts.map