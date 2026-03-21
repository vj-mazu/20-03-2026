const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const cacheService = require('../services/cacheService');
const { sequelize } = require('../config/database');

const router = express.Router();

// Get cache metrics (Admin only)
router.get('/cache', auth, authorize('admin'), async (req, res) => {
  try {
    const stats = cacheService.getStats();
    
    res.json({
      success: true,
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get cache metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch cache metrics' });
  }
});

// Get performance metrics (Admin only)
router.get('/performance', auth, authorize('admin'), async (req, res) => {
  try {
    // Get database connection pool stats
    const pool = sequelize.connectionManager.pool;
    const poolStats = {
      size: pool.size || 0,
      available: pool.available || 0,
      using: pool.using || 0,
      waiting: pool.waiting || 0
    };
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memory = {
      heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`
    };
    
    // Get process uptime
    const uptime = process.uptime();
    const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
    
    // Get cache stats
    const cacheStats = cacheService.getStats();
    
    res.json({
      success: true,
      metrics: {
        database: {
          connectionPool: poolStats,
          poolUtilization: pool.size > 0 ? `${((pool.using / pool.size) * 100).toFixed(2)}%` : '0%'
        },
        memory,
        cache: cacheStats,
        process: {
          uptime: uptimeFormatted,
          uptimeSeconds: Math.floor(uptime),
          nodeVersion: process.version,
          platform: process.platform
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch performance metrics' });
  }
});

// Reset cache statistics (Admin only)
router.post('/cache/reset', auth, authorize('admin'), async (req, res) => {
  try {
    cacheService.resetStats();
    
    res.json({
      success: true,
      message: 'Cache statistics reset successfully'
    });
  } catch (error) {
    console.error('Reset cache stats error:', error);
    res.status(500).json({ error: 'Failed to reset cache statistics' });
  }
});

// Clear cache (Admin only)
router.post('/cache/clear', auth, authorize('admin'), async (req, res) => {
  try {
    await cacheService.clear();
    
    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

module.exports = router;
