import { AppError, ErrorSeverity } from '../../types/errors';
export interface ErrorContext {
    operation: string;
    url?: string;
    selector?: string;
    statusCode?: number;
    responseTime?: number;
    retryCount?: number;
    userAgent?: string;
    timestamp: Date;
}
export interface FailurePattern {
    type: 'parsing' | 'network' | 'structure' | 'rate_limit' | 'timeout';
    pattern: RegExp | string;
    severity: ErrorSeverity;
    recoverable: boolean;
}
/**
 * Enhanced error handler with comprehensive logging and failure detection
 * Implements requirements 8.1, 8.2, 8.3 for detailed error handling
 */
export declare class ErrorHandler {
    private logger;
    private failurePatterns;
    private structureChangeDetector;
    private errorCounts;
    private lastStructureHashes;
    constructor();
    /**
     * Handle and log errors with comprehensive context
     * Requirement 8.1: Detailed logging for all failure scenarios
     */
    handleError(error: Error | AppError, context: ErrorContext): Promise<AppError>;
    /**
     * Detect parsing errors and structure changes
     * Requirement 8.3: Failure detection for parsing errors and structure changes
     */
    detectStructureChange(url: string, selector: string, error: Error): Promise<boolean>;
    /**
     * Create comprehensive app error from generic error
     */
    private createAppError;
    /**
     * Detect specific failure patterns
     */
    private detectFailurePattern;
    /**
     * Check if error is parsing-related
     */
    private isParsingError;
    /**
     * Determine if error is retryable
     */
    private isRetryableError;
    /**
     * Track error frequency for pattern detection
     */
    private trackErrorFrequency;
    /**
     * Attempt error recovery
     */
    private attemptRecovery;
    /**
     * Setup common failure patterns for detection
     */
    private setupFailurePatterns;
    /**
     * Generate unique error ID
     */
    private generateErrorId;
    /**
     * Get error statistics
     */
    getErrorStatistics(): Record<string, number>;
    /**
     * Clear error statistics
     */
    clearErrorStatistics(): void;
}
export declare const errorHandler: ErrorHandler;
//# sourceMappingURL=ErrorHandler.d.ts.map