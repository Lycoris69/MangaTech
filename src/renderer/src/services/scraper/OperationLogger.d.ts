export interface OperationContext {
    url?: string;
    selector?: string;
    retryCount?: number;
    statusCode?: number;
    errorMessage?: string;
    [key: string]: any;
}
export interface OperationRecord {
    id: string;
    name: string;
    startTime: number;
    endTime?: number;
    duration?: number;
    success?: boolean;
    context: OperationContext;
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
export interface OperationSummary {
    successRate: number;
    averageResponseTime: number;
    activeOperations: number;
    totalOperations: number;
}
/**
 * OperationLogger - Logs and tracks scraping operations
 *
 * Provides:
 * - Start/End operation tracking
 * - Performance metrics collection
 * - Historical operation log
 */
export declare class OperationLogger {
    private static logger;
    private activeOperations;
    private operationHistory;
    private maxHistorySize;
    private performanceMetrics;
    constructor(maxHistorySize?: number);
    /**
     * Start a new operation context
     */
    startOperation(name: string, context?: OperationContext): string;
    /**
     * End an operation context
     */
    endOperation(id: string, success: boolean, context?: OperationContext): void;
    /**
     * Get history of operations
     */
    getOperationHistory(limit?: number): OperationRecord[];
    /**
     * Get current performance metrics
     */
    getPerformanceMetrics(): PerformanceMetrics[];
    /**
   * Get summary of current operations
   */
    getOperationSummary(): OperationSummary;
    private generateOperationId;
}
export declare const operationLogger: OperationLogger;
//# sourceMappingURL=OperationLogger.d.ts.map