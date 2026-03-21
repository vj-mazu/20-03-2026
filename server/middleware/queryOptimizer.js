/**
 * Query Optimizer Middleware
 * 
 * Automatically optimizes database queries by:
 * - Adding query result caching
 * - Implementing pagination defaults
 * - Tracking slow queries
 * - Providing performance hints
 */

const cacheService = require('../services/cacheService');
const performanceConfig = require('../config/performance');

/**
 * Generate cache key from request
 */
function generateCacheKey(req) {
  const base = req.originalUrl.split('?')[0];
  const params = JSON.stringify(req.query);
  const userRole = req.user?.role || 'public';
  return `${base}:${userRole}:${params}`;
}

/**
 * Query Optimizer Middleware Factory
 */
function queryOptimizer(options = {}) {
  const {
    enabled = true,
    cacheTTL = 300, // 5 minutes default
    cacheEnabled = true,
    slowQueryThreshold = 1000,
    maxLimit = 10000,
    defaultLimit = 50
  } = options;

  return async (req, res, next) => {
    if (!enabled) {
      return next();
    }

    const startTime = Date.now();

    // Override json method to add caching
    const originalJson = res.json.bind(res);
    
    res.json = async function(data) {
      const responseTime = Date.now() - startTime;
      
      // Add performance header
      res.set('X-Response-Time', `${responseTime}ms`);
      res.set('X-Query-Optimized', 'true');

      // Auto-cache GET requests with query params
      if (cacheEnabled && req.method === 'GET' && req.query && Object.keys(req.query).length > 0) {
        try {
          const cacheKey = generateCacheKey(req);
          await cacheService.set(cacheKey, data, cacheTTL);
        } catch (error) {
          // Non-blocking - don't fail the request
        }
      }

      // Log slow queries
      if (responseTime > slowQueryThreshold) {
        console.warn(`⚠️ SLOW QUERY: ${req.method} ${req.originalUrl} - ${responseTime}ms`);
      }

      return originalJson(data);
    };

    // Enforce pagination limits on list endpoints
    if (req.method === 'GET' && req.query.limit) {
      const limit = parseInt(req.query.limit);
      if (limit > maxLimit) {
        req.query.limit = maxLimit.toString();
        console.log(`⚠️ Limit reduced to ${maxLimit} for ${req.originalUrl}`);
      }
    }

    // Add default limit if not provided
    if (req.method === 'GET' && !req.query.limit) {
      req.query.limit = defaultLimit.toString();
    }

    next();
  };
}

/**
 * Cached Route Handler
 * Wraps a route handler with automatic caching
 */
async function cachedRoute(cacheKey, fetchFn, ttl = 300) {
  // Try cache first
  const cached = await cacheService.get(cacheKey);
  if (cached) {
    return { data: cached, cached: true };
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Cache the result
  if (data) {
    await cacheService.set(cacheKey, data, ttl);
  }

  return { data, cached: false };
}

/**
 * Invalidate Cache Pattern
 * Helper to invalidate cache after mutations
 */
async function invalidateCache(pattern) {
  try {
    await cacheService.delPattern(pattern);
    console.log(`✅ Cache invalidated: ${pattern}`);
  } catch (error) {
    console.warn('⚠️ Cache invalidation failed:', error.message);
  }
}

module.exports = {
  queryOptimizer,
  cachedRoute,
  invalidateCache,
  generateCacheKey
};
