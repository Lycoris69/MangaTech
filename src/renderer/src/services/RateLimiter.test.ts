/**
 * Unit tests for RateLimiter and TokenBucket
 * Tests rate limiting functionality and token bucket algorithm
 */

import { RateLimiter, TokenBucket, RateLimitConfig } from './RateLimiter'

describe('TokenBucket', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with full capacity', () => {
    const bucket = new TokenBucket(5, 1)
    const stats = bucket.getStats()
    
    expect(stats.tokensAvailable).toBe(5)
    expect(stats.capacity).toBe(5)
    expect(stats.refillRate).toBe(1)
  })

  it('should consume tokens successfully when available', async () => {
    const bucket = new TokenBucket(5, 1)
    
    const result = await bucket.consume(3)
    expect(result).toBe(true)
    
    const stats = bucket.getStats()
    expect(stats.tokensAvailable).toBe(2)
  })

  it('should refill tokens over time', async () => {
    const bucket = new TokenBucket(5, 2) // 2 tokens per second
    
    // Consume all tokens
    await bucket.consume(5)
    expect(bucket.getStats().tokensAvailable).toBe(0)
    
    // Advance time by 1 second
    jest.advanceTimersByTime(1000)
    
    // Should have 2 tokens now
    const stats = bucket.getStats()
    expect(stats.tokensAvailable).toBe(2)
  })

  it('should not exceed capacity when refilling', async () => {
    const bucket = new TokenBucket(3, 5) // High refill rate
    
    // Advance time significantly
    jest.advanceTimersByTime(10000)
    
    const stats = bucket.getStats()
    expect(stats.tokensAvailable).toBe(3) // Should not exceed capacity
  })

  it('should wait for tokens when not available', async () => {
    const bucket = new TokenBucket(2, 1) // 1 token per second
    
    // Consume all tokens
    await bucket.consume(2)
    expect(bucket.getStats().tokensAvailable).toBe(0)
    
    // Try to consume more - should wait
    const consumePromise = bucket.consume(1)
    
    // Advance time to allow refill
    jest.advanceTimersByTime(1000)
    
    const result = await consumePromise
    expect(result).toBe(true)
  })

  it('should reject consumption beyond capacity', async () => {
    const bucket = new TokenBucket(3, 1)
    
    await expect(bucket.consume(5)).rejects.toThrow('Cannot consume more tokens than bucket capacity')
  })

  it('should reject invalid token counts', async () => {
    const bucket = new TokenBucket(3, 1)
    
    await expect(bucket.consume(0)).rejects.toThrow('Token count must be positive')
    await expect(bucket.consume(-1)).rejects.toThrow('Token count must be positive')
  })

  it('should handle canConsume correctly', () => {
    const bucket = new TokenBucket(3, 1)
    
    expect(bucket.canConsume(2)).toBe(true)
    expect(bucket.canConsume(3)).toBe(true)
    expect(bucket.canConsume(4)).toBe(false)
    
    expect(() => bucket.canConsume(0)).toThrow('Token count must be positive')
  })
})

describe('RateLimiter', () => {
  let config: RateLimitConfig

  beforeEach(() => {
    config = {
      requestsPerSecond: 2,
      burstLimit: 5,
      maxWaitTime: 10000
    }
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should initialize with valid configuration', () => {
    const rateLimiter = new RateLimiter(config)
    const stats = rateLimiter.getStats()
    
    expect(stats.config.requestsPerSecond).toBe(2)
    expect(stats.config.burstLimit).toBe(5)
    expect(stats.tokensAvailable).toBe(5)
  })

  it('should validate configuration on creation', () => {
    expect(() => new RateLimiter({
      requestsPerSecond: 0,
      burstLimit: 5
    })).toThrow('Requests per second must be positive')

    expect(() => new RateLimiter({
      requestsPerSecond: 5,
      burstLimit: 0
    })).toThrow('Burst limit must be positive')

    expect(() => new RateLimiter({
      requestsPerSecond: 5,
      burstLimit: 3
    })).toThrow('Burst limit should be at least equal to requests per second')
  })

  it('should acquire tokens successfully', async () => {
    const rateLimiter = new RateLimiter(config)
    
    const result = await rateLimiter.acquireToken()
    expect(result).toBe(true)
    
    const stats = rateLimiter.getStats()
    expect(stats.tokensAvailable).toBe(4)
  })

  it('should check token availability without consuming', () => {
    const rateLimiter = new RateLimiter(config)
    
    expect(rateLimiter.canMakeRequest()).toBe(true)
    
    // Should still have all tokens after check
    const stats = rateLimiter.getStats()
    expect(stats.tokensAvailable).toBe(5)
  })

  it('should update configuration correctly', () => {
    const rateLimiter = new RateLimiter(config)
    
    rateLimiter.updateConfig({
      requestsPerSecond: 3,
      burstLimit: 6
    })
    
    const stats = rateLimiter.getStats()
    expect(stats.config.requestsPerSecond).toBe(3)
    expect(stats.config.burstLimit).toBe(6)
    expect(stats.tokensAvailable).toBe(6) // New bucket created
  })

  it('should validate configuration on update', () => {
    const rateLimiter = new RateLimiter(config)
    
    expect(() => rateLimiter.updateConfig({
      requestsPerSecond: -1
    })).toThrow('Requests per second must be positive')
  })

  it('should handle burst requests within limit', async () => {
    const rateLimiter = new RateLimiter({
      requestsPerSecond: 1,
      burstLimit: 3
    })
    
    // Should be able to make 3 requests immediately
    expect(await rateLimiter.acquireToken()).toBe(true)
    expect(await rateLimiter.acquireToken()).toBe(true)
    expect(await rateLimiter.acquireToken()).toBe(true)
    
    const stats = rateLimiter.getStats()
    expect(stats.tokensAvailable).toBe(0)
  })
})

describe('RateLimiter Integration', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should respect rate limits over time', async () => {
    const rateLimiter = new RateLimiter({
      requestsPerSecond: 1,
      burstLimit: 2
    })
    
    // Use up burst capacity
    expect(await rateLimiter.acquireToken()).toBe(true)
    expect(await rateLimiter.acquireToken()).toBe(true)
    
    // Next request should wait
    const tokenPromise = rateLimiter.acquireToken()
    
    // Advance time to allow refill
    jest.advanceTimersByTime(1000)
    
    expect(await tokenPromise).toBe(true)
  })

  it('should handle sustained load correctly', async () => {
    const rateLimiter = new RateLimiter({
      requestsPerSecond: 2,
      burstLimit: 2
    })
    
    const results: boolean[] = []
    
    // Make requests faster than rate limit
    for (let i = 0; i < 4; i++) {
      const promise = rateLimiter.acquireToken()
      results.push(await promise)
      
      if (i === 1) {
        // After burst, advance time for refill
        jest.advanceTimersByTime(1000)
      }
    }
    
    // All requests should succeed (with waiting)
    expect(results.every(r => r === true)).toBe(true)
  })
})