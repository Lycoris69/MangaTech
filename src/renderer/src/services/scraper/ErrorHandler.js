"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ErrorHandler = void 0;
const Logger_1 = require("./Logger");
const errors_1 = require("../../types/errors");
const ErrorService_1 = require("../ErrorService");
/**
 * Enhanced error handler with comprehensive logging and failure detection
 * Implements requirements 8.1, 8.2, 8.3 for detailed error handling
 */
class ErrorHandler {
    constructor() {
        this.failurePatterns = [];
        this.structureChangeDetector = new Map();
        this.errorCounts = new Map();
        this.lastStructureHashes = new Map();
        this.logger = Logger_1.Logger.create('error-handler');
        this.setupFailurePatterns();
    }
    /**
     * Handle and log errors with comprehensive context
     * Requirement 8.1: Detailed logging for all failure scenarios
     */
    async handleError(error, context) {
        const timestamp = new Date();
        const errorId = this.generateErrorId();
        // Create standardized error if needed
        let appError;
        if ('id' in error) {
            appError = error;
        }
        else {
            appError = this.createAppError(error, context);
        }
        // Log detailed error information
        this.logger.error('Error occurred during operation', {
            errorId,
            operation: context.operation,
            url: context.url,
            selector: context.selector,
            statusCode: context.statusCode,
            responseTime: context.responseTime,
            retryCount: context.retryCount,
            userAgent: context.userAgent,
            timestamp,
            errorType: appError.type,
            severity: appError.severity,
            message: appError.message,
            stack: error.stack,
            context: appError.context
        });
        // Detect failure patterns
        const actualError = error instanceof Error ? error : new Error(appError.message || 'Unknown error');
        const failureType = this.detectFailurePattern(actualError, context);
        if (failureType) {
            this.logger.warn('Failure pattern detected', {
                errorId,
                failureType: failureType.type,
                pattern: failureType.pattern.toString(),
                severity: failureType.severity,
                recoverable: failureType.recoverable,
                operation: context.operation
            });
        }
        // Check for structure changes
        if (context.url && context.selector) {
            const structureChanged = await this.detectStructureChange(context.url, context.selector, actualError);
            if (structureChanged) {
                this.logger.error('Website structure change detected', {
                    errorId,
                    url: context.url,
                    selector: context.selector,
                    operation: context.operation,
                    timestamp
                });
                // Create structure change error
                const structureError = ErrorService_1.errorService.createScrapingError('Website structure has changed, selector no longer works', {
                    sourceUrl: context.url,
                    selector: context.selector,
                    severity: errors_1.ErrorSeverity.HIGH
                });
                return structureError;
            }
        }
        // Track error frequency
        this.trackErrorFrequency(appError.type, context.operation);
        // Attempt recovery if possible
        const recovered = await this.attemptRecovery(appError, context);
        if (recovered) {
            this.logger.info('Error recovery successful', {
                errorId,
                operation: context.operation,
                errorType: appError.type
            });
        }
        return appError;
    }
    /**
     * Detect parsing errors and structure changes
     * Requirement 8.3: Failure detection for parsing errors and structure changes
     */
    async detectStructureChange(url, selector, error) {
        const key = `${url}:${selector}`;
        // Check if this is a parsing-related error
        const isParsingError = this.isParsingError(error);
        if (!isParsingError) {
            return false;
        }
        // Track consecutive failures for this selector
        const errorKey = `parsing:${key}`;
        const currentCount = this.errorCounts.get(errorKey) || 0;
        this.errorCounts.set(errorKey, currentCount + 1);
        // If we've seen multiple failures for the same selector, likely a structure change
        if (currentCount >= 3) {
            this.logger.warn('Multiple parsing failures detected, possible structure change', {
                url,
                selector,
                failureCount: currentCount + 1
            });
            return true;
        }
        return false;
    }
    /**
     * Create comprehensive app error from generic error
     */
    createAppError(error, context) {
        let errorType = errors_1.ErrorType.UNKNOWN;
        let severity = errors_1.ErrorSeverity.MEDIUM;
        // Determine error type based on context and error message
        if (context.statusCode) {
            errorType = errors_1.ErrorType.NETWORK;
            severity = context.statusCode >= 500 ? errors_1.ErrorSeverity.HIGH : errors_1.ErrorSeverity.MEDIUM;
        }
        else if (context.selector || error.message.includes('selector')) {
            errorType = errors_1.ErrorType.SCRAPING;
            severity = errors_1.ErrorSeverity.MEDIUM;
        }
        else if (error.message.includes('timeout')) {
            errorType = errors_1.ErrorType.TIMEOUT;
            severity = errors_1.ErrorSeverity.MEDIUM;
        }
        return ErrorService_1.errorService.createError(errorType, error.message, {
            severity,
            details: error.stack,
            context: {
                operation: context.operation,
                url: context.url,
                selector: context.selector,
                statusCode: context.statusCode,
                responseTime: context.responseTime,
                retryCount: context.retryCount
            },
            retryable: this.isRetryableError(error, context),
            originalError: error
        });
    }
    /**
     * Detect specific failure patterns
     */
    detectFailurePattern(error, context) {
        const errorMessage = error.message.toLowerCase();
        for (const pattern of this.failurePatterns) {
            if (pattern.pattern instanceof RegExp) {
                if (pattern.pattern.test(errorMessage)) {
                    return pattern;
                }
            }
            else {
                if (errorMessage.includes(pattern.pattern.toLowerCase())) {
                    return pattern;
                }
            }
        }
        return null;
    }
    /**
     * Check if error is parsing-related
     */
    isParsingError(error) {
        const parsingKeywords = [
            'selector',
            'element not found',
            'cheerio',
            'parse',
            'extract',
            'undefined property',
            'cannot read property'
        ];
        const errorMessage = error.message.toLowerCase();
        return parsingKeywords.some(keyword => errorMessage.includes(keyword));
    }
    /**
     * Determine if error is retryable
     */
    isRetryableError(error, context) {
        // Network errors are generally retryable
        if (context.statusCode) {
            return context.statusCode >= 500 || context.statusCode === 429 || context.statusCode === 408;
        }
        // Timeout errors are retryable
        if (error.message.includes('timeout')) {
            return true;
        }
        // Parsing errors are generally not retryable (structure issue)
        if (this.isParsingError(error)) {
            return false;
        }
        return true;
    }
    /**
     * Track error frequency for pattern detection
     */
    trackErrorFrequency(errorType, operation) {
        const key = `${errorType}:${operation}`;
        const currentCount = this.errorCounts.get(key) || 0;
        this.errorCounts.set(key, currentCount + 1);
        // Log if error frequency is high
        if (currentCount > 5) {
            this.logger.warn('High error frequency detected', {
                errorType,
                operation,
                count: currentCount + 1
            });
        }
    }
    /**
     * Attempt error recovery
     */
    async attemptRecovery(error, context) {
        try {
            const recovered = await ErrorService_1.errorService.handleError(error);
            if (recovered) {
                this.logger.info('Error recovery attempted', {
                    errorType: error.type,
                    operation: context.operation,
                    success: recovered
                });
            }
            return recovered;
        }
        catch (recoveryError) {
            this.logger.error('Error recovery failed', {
                originalError: error.type,
                operation: context.operation,
                recoveryError: recoveryError instanceof Error ? recoveryError.message : 'Unknown error'
            });
            return false;
        }
    }
    /**
     * Setup common failure patterns for detection
     */
    setupFailurePatterns() {
        this.failurePatterns = [
            {
                type: 'parsing',
                pattern: /selector.*not found|element.*undefined|cheerio.*error/i,
                severity: errors_1.ErrorSeverity.HIGH,
                recoverable: false
            },
            {
                type: 'network',
                pattern: /network error|connection.*failed|timeout/i,
                severity: errors_1.ErrorSeverity.MEDIUM,
                recoverable: true
            },
            {
                type: 'rate_limit',
                pattern: /rate limit|too many requests|429/i,
                severity: errors_1.ErrorSeverity.MEDIUM,
                recoverable: true
            },
            {
                type: 'structure',
                pattern: /unexpected.*structure|layout.*changed|missing.*element/i,
                severity: errors_1.ErrorSeverity.HIGH,
                recoverable: false
            },
            {
                type: 'timeout',
                pattern: /timeout|timed out|request.*timeout/i,
                severity: errors_1.ErrorSeverity.MEDIUM,
                recoverable: true
            }
        ];
    }
    /**
     * Generate unique error ID
     */
    generateErrorId() {
        return `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get error statistics
     */
    getErrorStatistics() {
        return Object.fromEntries(this.errorCounts);
    }
    /**
     * Clear error statistics
     */
    clearErrorStatistics() {
        this.errorCounts.clear();
    }
}
exports.ErrorHandler = ErrorHandler;
// Singleton instance
exports.errorHandler = new ErrorHandler();
//# sourceMappingURL=ErrorHandler.js.map