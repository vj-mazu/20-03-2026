/**
 * Enhanced Cache Service for 10 Lakh Records
 * 
 * Provides in-memory caching with:
 * - LRU (Least Recently Used) eviction
 * - Memory limit protection (max 10,000 items)
 * - TTL support with auto-expiry
 * - Performance statistics
 * 
 * For production, this can be replaced with Redis by setting REDIS_URL env var
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
    this.accessOrder = []; // Track access order for LRU eviction
    this.enabled = process.env.CACHE_ENABLED !== 'false'; // Enabled by default
    this.maxItems = parseInt(process.env.CACHE_MAX_ITEMS) || 10000; // Limit for memory protection
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    // Log cache configuration
    console.log(`📦 Cache Service initialized: maxItems=${this.maxItems}, enabled=${this.enabled}`);
  }

  /**
   * Evict least recently used items when cache is full
   * @param {number} count - Number of items to evict
   * @private
   */
  evictLRU(count = 1) {
    const itemsToEvict = Math.min(count, this.accessOrder.length);

    for (let i = 0; i < itemsToEvict; i++) {
      const keyToEvict = this.accessOrder.shift();
      if (keyToEvict && this.cache.has(keyToEvict)) {
        this.cache.delete(keyToEvict);
        this.clearTimer(keyToEvict);
        this.stats.evictions++;
      }
    }
  }

  /**
   * Update access order for LRU tracking
   * @param {string} key - Cache key
   * @private
   */
  updateAccessOrder(key) {
    // Remove existing entry
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {Promise<any>} Cached value or null
   */
  async get(key) {
    if (!this.enabled) return null;

    try {
      const item = this.cache.get(key);

      if (!item) {
        this.stats.misses++;
        return null;
      }

      // Check if expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.clearTimer(key);
        this.removeFromAccessOrder(key);
        this.stats.misses++;
        return null;
      }

      // Update LRU tracking
      this.updateAccessOrder(key);

      this.stats.hits++;
      return item.value;
    } catch (error) {
      console.warn('Cache get error:', error.message);
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in seconds (default: 5 minutes)
   * @returns {Promise<boolean>} Success status
   */
  async set(key, value, ttl = 300) {
    if (!this.enabled) return false;

    try {
      // Check if we need to evict items (LRU eviction for memory protection)
      if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
        // Evict 10% of cache when full for efficiency
        const evictCount = Math.max(1, Math.floor(this.maxItems * 0.1));
        this.evictLRU(evictCount);

        if (process.env.NODE_ENV === 'development') {
          console.log(`🧹 Cache LRU eviction: removed ${evictCount} items (cache was full at ${this.maxItems})`);
        }
      }

      const expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : null;

      this.cache.set(key, {
        value,
        expiresAt,
        createdAt: Date.now()
      });

      // Update LRU tracking
      this.updateAccessOrder(key);

      // Set timer to auto-delete after TTL
      if (ttl > 0) {
        this.clearTimer(key);
        const timer = setTimeout(() => {
          this.cache.delete(key);
          this.timers.delete(key);
          this.removeFromAccessOrder(key);
        }, ttl * 1000);
        this.timers.set(key, timer);
      }

      this.stats.sets++;
      return true;
    } catch (error) {
      console.warn('Cache set error:', error.message);
      return false;
    }
  }

  /**
   * Remove key from access order array
   * @param {string} key - Cache key
   * @private
   */
  removeFromAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Success status
   */
  async del(key) {
    if (!this.enabled) return false;

    try {
      const deleted = this.cache.delete(key);
      this.clearTimer(key);
      this.removeFromAccessOrder(key);

      if (deleted) {
        this.stats.deletes++;
      }

      return deleted;
    } catch (error) {
      console.warn('Cache delete error:', error.message);
      return false;
    }
  }

  /**
   * Delete all keys matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   * @returns {Promise<number>} Number of keys deleted
   */
  async delPattern(pattern) {
    if (!this.enabled) return 0;

    try {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      let count = 0;

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          await this.del(key);
          count++;
        }
      }

      return count;
    } catch (error) {
      console.warn('Cache delPattern error:', error.message);
      return 0;
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} Exists status
   */
  async exists(key) {
    if (!this.enabled) return false;

    try {
      const item = this.cache.get(key);

      if (!item) return false;

      // Check if expired
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.cache.delete(key);
        this.clearTimer(key);
        this.removeFromAccessOrder(key);
        return false;
      }

      return true;
    } catch (error) {
      console.warn('Cache exists error:', error.message);
      return false;
    }
  }

  /**
   * Get or set value (cache-aside pattern for convenience)
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function to fetch value if not cached
   * @param {number} ttl - Time to live in seconds
   * @returns {Promise<any>} Cached or fetched value
   */
  async getOrSet(key, fetchFn, ttl = 300) {
    // Try to get from cache first
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const value = await fetchFn();

    // Cache the result
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }

    return value;
  }

  /**
   * Clear all cache entries
   * @returns {Promise<void>}
   */
  async clear() {
    try {
      // Clear all timers
      for (const timer of this.timers.values()) {
        clearTimeout(timer);
      }

      this.cache.clear();
      this.timers.clear();
      this.accessOrder = [];

      console.log('✅ Cache cleared');
    } catch (error) {
      console.warn('Cache clear error:', error.message);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    // Estimate memory usage (rough approximation)
    const estimatedMemoryMB = (this.cache.size * 2) / 1024; // ~2KB per item average

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxItems: this.maxItems,
      memoryEstimateMB: estimatedMemoryMB.toFixed(2),
      enabled: this.enabled
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Clear timer for a key
   * @param {string} key - Cache key
   * @private
   */
  clearTimer(key) {
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }
  }

  /**
   * Enable caching
   */
  enable() {
    this.enabled = true;
    console.log('✅ Cache enabled');
  }

  /**
   * Disable caching
   */
  disable() {
    this.enabled = false;
    console.log('⚠️ Cache disabled');
  }

  /**
   * Set maximum items limit
   * @param {number} max - Maximum items to cache
   */
  setMaxItems(max) {
    this.maxItems = max;

    // Evict if current size exceeds new limit
    if (this.cache.size > this.maxItems) {
      this.evictLRU(this.cache.size - this.maxItems);
    }

    console.log(`📦 Cache max items set to: ${this.maxItems}`);
  }
}

// Export singleton instance
module.exports = new CacheService();
