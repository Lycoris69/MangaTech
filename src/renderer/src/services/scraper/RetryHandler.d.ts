/**
 * RetryHandler - Exponential backoff retry mechanism for failed requests
 *
 * Implements retry logic with exponential backoff for handling transient
 * failures when scraping manhwaz.com. Provides configurable retry attempts,
 * delays, and backoff strategies.
 *
 * Requirements: 5.2, 5.3
 */
import winston from 'winston';
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitterEnabled?: boolean;
}
export interface RetryContext {
    operation: string;
    attempt: number;
    totalAttempts: number;
    delay: number;
    error?: Error;
}
export type RetryPredicate = (error: Error, context: RetryContext) => boolean;
/**
 * Default retry predicate that retries on network errors and 5xx status codes
 */
export declare const defaultRetryPredicate: RetryPredicate;
/**
 * Retry handler with exponential backoff
 */
export declare class RetryHandler {
    private config;
    private logger;
    constructor(config: RetryConfig, logger?: winston.Logger);
    /**
     * Executes an operation with retry logic
     * @param operation - Async operation to execute
     * @param operationName - Name for logging purposes
     * @param retryPredicate - Custom predicate to determine if retry should occur
     * @returns Promise resolving to operation result
     */
    executeWithRetry<T>(operation: () => Promise<T>, operationName: string, retryPredicate?: RetryPredicate): Promise<T>;
    /**
     * Calculates delay for the given attempt with exponential backoff
     * @param attempt - Current attempt number (1-based)
     * @returns Delay in milliseconds
     */
    private calculateDelay;
    /**
     * Creates a delay promise
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after the delay
     */
    private delay;
    /**
     * Gets current retry configuration
     * @returns Current configuration
     */
    getConfig(): RetryConfig;
    /**
     * Updates retry configuration
     * @param newConfig - New configuration (partial update)
     */
    updateConfig(newConfig: Partial<RetryConfig>): void;
    /**
     * Validates retry configuration
     */
    private validateConfig;
}
//# sourceMappingURL=RetryHandler.d.ts.map