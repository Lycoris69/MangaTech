/**
 * RateLimiter - Token bucket implementation for request rate limiting
 *
 * Implements a token bucket algorithm to control the rate of requests
 * to manhwaz.com, ensuring respectful scraping practices and compliance
 * with server resource limitations.
 *
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */
export interface RateLimitConfig {
    requestsPerSecond: number;
    burstLimit: number;
    maxWaitTime?: number;
}
export interface RateLimitStats {
    tokensAvailable: number;
    capacity: number;
    refillRate: number;
    lastRefill: number;
}
/**
 * Token bucket implementation for rate limiting
 */
export declare class TokenBucket {
    private tokens;
    private lastRefill;
    private readonly capacity;
    private readonly refillRate;
    private readonly maxWaitTime;
    constructor(capacity: number, refillRate: number, maxWaitTime?: number);
    /**
     * Attempts to consume tokens from the bucket
     * @param tokens - Number of tokens to consume (default: 1)
     * @returns Promise that resolves to true if tokens were consumed
     */
    consume(tokens?: number): Promise<boolean>;
    /**
     * Checks if tokens are available without consuming them
     * @param tokens - Number of tokens to check (default: 1)
     * @returns true if tokens are available
     */
    canConsume(tokens?: number): boolean;
    /**
     * Gets current bucket statistics
     * @returns Current bucket state
     */
    getStats(): RateLimitStats;
    /**
     * Refills tokens based on elapsed time
     */
    private refill;
    /**
     * Utility method for creating delays
     */
    private delay;
}
/**
 * Rate limiter that uses token bucket algorithm
 */
export declare class RateLimiter {
    private tokenBucket;
    private config;
    constructor(config: RateLimitConfig);
    /**
     * Acquires permission to make a request
     * @returns Promise that resolves to true if request is allowed
     */
    acquireToken(): Promise<boolean>;
    /**
     * Checks if a request can be made immediately
     * @returns true if request can be made without waiting
     */
    canMakeRequest(): boolean;
    /**
     * Gets current rate limiting statistics
     * @returns Rate limiter statistics
     */
    getStats(): RateLimitStats & {
        config: RateLimitConfig;
    };
    /**
     * Updates rate limiting configuration
     * @param newConfig - New rate limiting configuration
     */
    updateConfig(newConfig: Partial<RateLimitConfig>): void;
    /**
     * Validates rate limiting configuration
     */
    private validateConfig;
}
//# sourceMappingURL=RateLimiter.d.ts.map