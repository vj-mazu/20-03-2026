/**
 * Redis Cache Service for Production Performance
 * 
 * Provides distributed caching with Redis for multi-instance deployments
 * Falls back to in-memory cache if Redis is not available
 * 
 * Installation: npm install ioredis
 */

const Redis = require('ioredis');

// Redis client (lazy initialization)
let redisClient = null;
let isRedisAvailable = false;

// Configuration
const REDIS_URL = process.env.REDIS_URL;
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 300; // 5 minutes default

class RedisCacheService {
  constructor() {
    this.localCache = new Map();
    this.useRedis = !!REDIS_URL;
    
    if (this.useRedis) {
      this.initializeRedis();
    } else {
      console.log('📦 Using in-memory cache (REDIS_URL not set)');
    }
  }

  /**
   * Initialize Redis connection
   */
  initializeRedis() {
    try {
      redisClient = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryDelayOnFailover: 100,
        enableReadyCheck: true,
        lazyConnect: true,
        connectTimeout: 5000,
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected successfully');
        isRedisAvailable = true;
      });

      redisClient.on('error', (err) => {
        console.warn('⚠️ Redis error, falling back to in-memory:', err.message);
        isRedisAvailable = false;
      });

      redisClient.on('close', () => {
        console.warn('⚠️ Redis connection closed');
        isRedisAvailable = false;
      });

    } catch (error) {
      console.warn('⚠️ Failed to initialize Redis:', error.message);
      isRedisAvailable = false;
    }
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    // Try Redis first if available
    if (isRedisAvailable && redisClient) {
      try {
        const value = await redisClient.get(key);
        if (value) {
          return JSON.parse(value);
        }
        return null;
      } catch (error) {
        console.warn('Redis get error:', error.message);
      }
    }

    // Fallback to local cache
    const item = this.localCache.get(key);
    if (!item) return null;

    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.localCache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds
   */
  async set(key, value, ttl = CACHE_TTL) {
    const serialized = JSON.stringify(value);

    // Try Redis first if available
    if (isRedisAvailable && redisClient) {
      try {
        await redisClient.setex(key, ttl, serialized);
        return true;
      } catch (error) {
        console.warn('Redis set error:', error.message);
      }
    }

    // Fallback to local cache
    const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : null;
    this.localCache.set(key, { value, expiresAt });

    // Cleanup old entries if cache is too large
    if (this.localCache.size > 10000) {
      this.cleanupLocalCache();
    }

    return true;
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   */
  async del(key) {
    // Try Redis first if available
    if (isRedisAvailable && redisClient) {
      try {
        await redisClient.del(key);
      } catch (error) {
        console.warn('Redis delete error:', error.message);
      }
    }

    // Also delete from local cache
    this.localCache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern (supports * wildcard)
   */
  async delPattern(pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

    // Try Redis first if available
    if (isRedisAvailable && redisClient) {
      try {
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } catch (error) {
        console.warn('Redis pattern delete error:', error.message);
      }
    }

    // Also clean local cache
    for (const key of this.localCache.keys()) {
      if (regex.test(key)) {
        this.localCache.delete(key);
      }
    }
  }

  /**
   * Get or set value (cache-aside pattern)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch if not cached
   * @param {number} ttl - Time to live in seconds
   */
  async getOrSet(key, fetchFn, ttl = CACHE_TTL) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetchFn();
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }

    return value;
  }

  /**
   * Check if Redis is available
   */
  isReady() {
    return isRedisAvailable;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      redisAvailable: isRedisAvailable,
      useRedis: this.useRedis,
      localCacheSize: this.localCache.size,
      maxLocalCache: 10000
    };
  }

  /**
   * Cleanup old entries from local cache
   */
  cleanupLocalCache() {
    const now = Date.now();
    let removed = 0;

    for (const [key, item] of this.localCache.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        this.localCache.delete(key);
        removed++;
      }
    }

    // If still too large, remove oldest entries
    if (this.localCache.size > 10000) {
      const keysToRemove = Array.from(this.localCache.keys()).slice(0, 1000);
      keysToRemove.forEach(key => this.localCache.delete(key));
      removed += keysToRemove.length;
    }

    if (removed > 0) {
      console.log(`🧹 Cleaned up ${removed} entries from local cache`);
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    if (isRedisAvailable && redisClient) {
      try {
        await redisClient.flushdb();
      } catch (error) {
        console.warn('Redis clear error:', error.message);
      }
    }
    this.localCache.clear();
  }
}

// Export singleton instance
module.exports = new RedisCacheService();
