/**
 * Performance Metrics API Routes
 * Provides endpoints to view and analyze performance data
 */

const express = require('express');
const router = express.Router();
const PerformanceMonitor = require('../utils/PerformanceMonitor');

/**
 * GET /api/performance-metrics/summary
 * Get aggregated performance metrics
 */
router.get('/summary', async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '1 hour';
    
    const metrics = await PerformanceMonitor.getMetrics(timeRange);
    const percentiles = await PerformanceMonitor.getPercentileMetrics(timeRange);
    
    res.json({
      success: true,
      timeRange,
      metrics: {
        ...metrics,
        ...percentiles
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
});

/**
 * GET /api/performance-metrics/slowest-endpoints
 * Get slowest API endpoints
 */
router.get('/slowest-endpoints', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const timeRange = req.query.timeRange || '1 hour';
    
    const slowestEndpoints = await PerformanceMonitor.getSlowestEndpoints(limit, timeRange);
    
    res.json({
      success: true,
      timeRange,
      endpoints: slowestEndpoints
    });
  } catch (error) {
    console.error('Error fetching slowest endpoints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch slowest endpoints'
    });
  }
});

/**
 * POST /api/performance-metrics/cleanup
 * Clean up old performance metrics
 */
router.post('/cleanup', async (req, res) => {
  try {
    const daysToKeep = parseInt(req.body.daysToKeep) || 7;
    
    await PerformanceMonitor.cleanupOldMetrics(daysToKeep);
    
    res.json({
      success: true,
      message: `Cleaned up metrics older than ${daysToKeep} days`
    });
  } catch (error) {
    console.error('Error cleaning up metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup metrics'
    });
  }
});

/**
 * GET /api/performance-metrics/health
 * Check performance monitoring health
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    enabled: PerformanceMonitor.enabled,
    slowQueryThreshold: PerformanceMonitor.slowQueryThreshold,
    verySlowQueryThreshold: PerformanceMonitor.verySlowQueryThreshold
  });
});

module.exports = router;
