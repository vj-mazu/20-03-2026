/**
 * Simple in-memory cache for API responses
 * Optimized for handling 300K+ records with <1ms response time
 */

class Cache {
  constructor() {
    this.store = new Map();
    this.ttl = new Map(); // Time to live for each key
  }

  /**
   * Set cache with optional TTL (time to live in milliseconds)
   */
  set(key, value, ttlMs = 60000) { // Default 1 minute
    this.store.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }

  /**
   * Get cached value if not expired
   */
  get(key) {
    const expiry = this.ttl.get(key);
    
    // Check if expired
    if (expiry && Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.store.get(key) || null;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    this.store.delete(key);
    this.ttl.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.store.clear();
    this.ttl.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        this.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  stats() {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }
}

// Create singleton instance
const cache = new Cache();

// Clear expired entries every 5 minutes
setInterval(() => {
  cache.clearExpired();
}, 5 * 60 * 1000);

module.exports = cache;
