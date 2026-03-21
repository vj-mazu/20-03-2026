/**
 * In-Memory Cache Middleware (Redis-compatible pattern)
 * 
 * Provides response caching for frequently-accessed read endpoints.
 * Uses in-memory Map for now. Drop-in replaceable with Redis when needed.
 * 
 * Usage:
 *   const { cacheMiddleware, invalidateCache } = require('./middleware/cache');
 *   router.get('/list', cacheMiddleware(60), handler);  // 60 second TTL
 *   router.post('/create', handler); // call invalidateCache('list') after mutation
 */

class ResponseCache {
    constructor() {
        this.store = new Map();
        this.hits = 0;
        this.misses = 0;

        // Periodic cleanup every 60 seconds
        setInterval(() => this.cleanup(), 60000);
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) {
            this.misses++;
            return null;
        }
        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            this.misses++;
            return null;
        }
        this.hits++;
        return entry.data;
    }

    set(key, data, ttlSeconds) {
        // Cap cache at 500 entries to prevent memory leaks
        if (this.store.size > 500) {
            // Delete oldest 100 entries
            const keys = [...this.store.keys()].slice(0, 100);
            keys.forEach(k => this.store.delete(k));
        }
        this.store.set(key, {
            data,
            expiry: Date.now() + (ttlSeconds * 1000),
            createdAt: Date.now()
        });
    }

    invalidate(pattern) {
        if (!pattern) {
            this.store.clear();
            return;
        }
        // Delete all keys matching the pattern
        for (const key of this.store.keys()) {
            if (key.includes(pattern)) {
                this.store.delete(key);
            }
        }
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiry) {
                this.store.delete(key);
            }
        }
    }

    getStats() {
        return {
            entries: this.store.size,
            hits: this.hits,
            misses: this.misses,
            hitRate: this.hits + this.misses > 0
                ? ((this.hits / (this.hits + this.misses)) * 100).toFixed(1) + '%'
                : '0%'
        };
    }
}

const cache = new ResponseCache();

/**
 * Cache middleware — wraps response.json() to cache GET responses
 * @param {number} ttlSeconds - Time to live in seconds (default 60)
 */
const cacheMiddleware = (ttlSeconds = 60) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') return next();

        const key = `${req.originalUrl}`;
        const cached = cache.get(key);

        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached);
        }

        // Override res.json to intercept the response
        const originalJson = res.json.bind(res);
        res.json = (data) => {
            // Only cache successful responses
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, data, ttlSeconds);
            }
            res.setHeader('X-Cache', 'MISS');
            return originalJson(data);
        };

        next();
    };
};

/**
 * Invalidate cache entries matching a pattern
 * Call after any mutation (POST/PUT/DELETE)
 */
const invalidateCache = (pattern) => {
    cache.invalidate(pattern);
};

/**
 * Get cache statistics
 */
const getCacheStats = () => cache.getStats();

module.exports = { cacheMiddleware, invalidateCache, getCacheStats };
