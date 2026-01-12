"use strict";
/**
 * RateLimiter - Token bucket implementation for request rate limiting
 *
 * Implements a token bucket algorithm to control the rate of requests
 * to manhwaz.com, ensuring respectful scraping practices and compliance
 * with server resource limitations.
 *
 * Requirements: 5.1, 5.2, 5.4, 5.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.TokenBucket = void 0;
/**
 * Token bucket implementation for rate limiting
 */
class TokenBucket {
    constructor(capacity, refillRate, maxWaitTime = 30000) {
        if (capacity <= 0) {
            throw new Error('Token bucket capacity must be positive');
        }
        if (refillRate <= 0) {
            throw new Error('Token bucket refill rate must be positive');
        }
        if (maxWaitTime <= 0) {
            throw new Error('Max wait time must be positive');
        }
        this.capacity = capacity;
        this.refillRate = refillRate;
        this.maxWaitTime = maxWaitTime;
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }
    /**
     * Attempts to consume tokens from the bucket
     * @param tokens - Number of tokens to consume (default: 1)
     * @returns Promise that resolves to true if tokens were consumed
     */
    async consume(tokens = 1) {
        if (tokens <= 0) {
            throw new Error('Token count must be positive');
        }
        if (tokens > this.capacity) {
            throw new Error('Cannot consume more tokens than bucket capacity');
        }
        this.refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        // Calculate wait time for next token availability
        const tokensNeeded = tokens - this.tokens;
        const waitTime = (tokensNeeded / this.refillRate) * 1000;
        if (waitTime > this.maxWaitTime) {
            return false;
        }
        await this.delay(waitTime);
        this.refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }
    /**
     * Checks if tokens are available without consuming them
     * @param tokens - Number of tokens to check (default: 1)
     * @returns true if tokens are available
     */
    canConsume(tokens = 1) {
        if (tokens <= 0) {
            throw new Error('Token count must be positive');
        }
        this.refill();
        return this.tokens >= tokens;
    }
    /**
     * Gets current bucket statistics
     * @returns Current bucket state
     */
    getStats() {
        this.refill();
        return {
            tokensAvailable: this.tokens,
            capacity: this.capacity,
            refillRate: this.refillRate,
            lastRefill: this.lastRefill
        };
    }
    /**
     * Refills tokens based on elapsed time
     */
    refill() {
        const now = Date.now();
        const timePassed = (now - this.lastRefill) / 1000;
        const tokensToAdd = timePassed * this.refillRate;
        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }
    /**
     * Utility method for creating delays
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.TokenBucket = TokenBucket;
/**
 * Rate limiter that uses token bucket algorithm
 */
class RateLimiter {
    constructor(config) {
        this.validateConfig(config);
        this.config = config;
        this.tokenBucket = new TokenBucket(config.burstLimit, config.requestsPerSecond, config.maxWaitTime);
    }
    /**
     * Acquires permission to make a request
     * @returns Promise that resolves to true if request is allowed
     */
    async acquireToken() {
        return await this.tokenBucket.consume(1);
    }
    /**
     * Checks if a request can be made immediately
     * @returns true if request can be made without waiting
     */
    canMakeRequest() {
        return this.tokenBucket.canConsume(1);
    }
    /**
     * Gets current rate limiting statistics
     * @returns Rate limiter statistics
     */
    getStats() {
        return {
            ...this.tokenBucket.getStats(),
            config: { ...this.config }
        };
    }
    /**
     * Updates rate limiting configuration
     * @param newConfig - New rate limiting configuration
     */
    updateConfig(newConfig) {
        const updatedConfig = { ...this.config, ...newConfig };
        this.validateConfig(updatedConfig);
        this.config = updatedConfig;
        this.tokenBucket = new TokenBucket(updatedConfig.burstLimit, updatedConfig.requestsPerSecond, updatedConfig.maxWaitTime);
    }
    /**
     * Validates rate limiting configuration
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Rate limit configuration is required');
        }
        if (config.requestsPerSecond <= 0) {
            throw new Error('Requests per second must be positive');
        }
        if (config.burstLimit <= 0) {
            throw new Error('Burst limit must be positive');
        }
        if (config.burstLimit < config.requestsPerSecond) {
            throw new Error('Burst limit should be at least equal to requests per second');
        }
        if (config.maxWaitTime !== undefined && config.maxWaitTime <= 0) {
            throw new Error('Max wait time must be positive');
        }
    }
}
exports.RateLimiter = RateLimiter;
//# sourceMappingURL=RateLimiter.js.map