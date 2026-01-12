"use strict";
/**
 * RetryHandler - Exponential backoff retry mechanism for failed requests
 *
 * Implements retry logic with exponential backoff for handling transient
 * failures when scraping manhwaz.com. Provides configurable retry attempts,
 * delays, and backoff strategies.
 *
 * Requirements: 5.2, 5.3
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryHandler = exports.defaultRetryPredicate = void 0;
const winston_1 = __importDefault(require("winston"));
/**
 * Default retry predicate that retries on network errors and 5xx status codes
 */
const defaultRetryPredicate = (error, context) => {
    // Don't retry on final attempt
    if (context.attempt >= context.totalAttempts) {
        return false;
    }
    // Retry on network errors
    if (error.message.includes('ECONNRESET') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')) {
        return true;
    }
    // Retry on 5xx server errors and 429 rate limiting
    if ('status' in error) {
        const status = error.status;
        return status >= 500 || status === 429;
    }
    return false;
};
exports.defaultRetryPredicate = defaultRetryPredicate;
/**
 * Retry handler with exponential backoff
 */
class RetryHandler {
    constructor(config, logger) {
        this.validateConfig(config);
        this.config = config;
        this.logger = logger || winston_1.default.createLogger({
            level: 'info',
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            defaultMeta: { service: 'retry-handler' },
            transports: [
                new winston_1.default.transports.Console({
                    format: winston_1.default.format.simple()
                })
            ]
        });
    }
    /**
     * Executes an operation with retry logic
     * @param operation - Async operation to execute
     * @param operationName - Name for logging purposes
     * @param retryPredicate - Custom predicate to determine if retry should occur
     * @returns Promise resolving to operation result
     */
    async executeWithRetry(operation, operationName, retryPredicate = exports.defaultRetryPredicate) {
        let lastError = null;
        for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
            const context = {
                operation: operationName,
                attempt,
                totalAttempts: this.config.maxAttempts,
                delay: 0
            };
            try {
                this.logger.debug('Executing operation', {
                    operation: operationName,
                    attempt,
                    totalAttempts: this.config.maxAttempts
                });
                return await operation();
            }
            catch (error) {
                lastError = error instanceof Error ? error : new Error('Unknown error');
                context.error = lastError;
                this.logger.warn('Operation failed', {
                    operation: operationName,
                    attempt,
                    totalAttempts: this.config.maxAttempts,
                    error: lastError.message,
                    stack: lastError.stack
                });
                // Check if we should retry
                if (!retryPredicate(lastError, context)) {
                    this.logger.info('Retry predicate returned false, not retrying', {
                        operation: operationName,
                        attempt,
                        error: lastError.message
                    });
                    break;
                }
                // Don't delay after the last attempt
                if (attempt === this.config.maxAttempts) {
                    break;
                }
                // Calculate delay with exponential backoff
                const delay = this.calculateDelay(attempt);
                context.delay = delay;
                this.logger.info('Retrying operation', {
                    operation: operationName,
                    attempt,
                    nextAttempt: attempt + 1,
                    delay,
                    error: lastError.message
                });
                await this.delay(delay);
            }
        }
        // All attempts failed
        const finalError = new Error(`Operation '${operationName}' failed after ${this.config.maxAttempts} attempts. Last error: ${lastError?.message}`);
        // Preserve original error stack if available
        if (lastError?.stack) {
            finalError.stack = lastError.stack;
        }
        this.logger.error('All retry attempts exhausted', {
            operation: operationName,
            totalAttempts: this.config.maxAttempts,
            finalError: finalError.message
        });
        throw finalError;
    }
    /**
     * Calculates delay for the given attempt with exponential backoff
     * @param attempt - Current attempt number (1-based)
     * @returns Delay in milliseconds
     */
    calculateDelay(attempt) {
        // Calculate exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
        let delay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
        // Apply jitter if enabled (±25% random variation)
        if (this.config.jitterEnabled) {
            const jitterRange = delay * 0.25;
            const jitter = (Math.random() - 0.5) * 2 * jitterRange;
            delay += jitter;
        }
        // Cap at maximum delay
        return Math.min(delay, this.config.maxDelay);
    }
    /**
     * Creates a delay promise
     * @param ms - Milliseconds to delay
     * @returns Promise that resolves after the delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Gets current retry configuration
     * @returns Current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Updates retry configuration
     * @param newConfig - New configuration (partial update)
     */
    updateConfig(newConfig) {
        const updatedConfig = { ...this.config, ...newConfig };
        this.validateConfig(updatedConfig);
        this.config = updatedConfig;
    }
    /**
     * Validates retry configuration
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Retry configuration is required');
        }
        if (config.maxAttempts <= 0) {
            throw new Error('Max attempts must be positive');
        }
        if (config.baseDelay <= 0) {
            throw new Error('Base delay must be positive');
        }
        if (config.maxDelay <= 0) {
            throw new Error('Max delay must be positive');
        }
        if (config.maxDelay < config.baseDelay) {
            throw new Error('Max delay must be greater than or equal to base delay');
        }
        if (config.backoffMultiplier <= 1) {
            throw new Error('Backoff multiplier must be greater than 1');
        }
    }
}
exports.RetryHandler = RetryHandler;
//# sourceMappingURL=RetryHandler.js.map