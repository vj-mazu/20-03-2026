/**
 * Performance Monitor Class
 * Comprehensive performance tracking and alerting system
 */

const { sequelize } = require('../config/database');

class PerformanceMonitor {
  constructor() {
    this.enabled = process.env.ENABLE_PERFORMANCE_MONITORING !== 'false';
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD) || 100;
    this.verySlowQueryThreshold = parseInt(process.env.VERY_SLOW_QUERY_THRESHOLD) || 1000;
  }

  /**
   * Start timing a request
   */
  startTimer(requestId) {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return {
      stop: () => {
        return {
          duration: Date.now() - startTime,
          memoryUsed: process.memoryUsage().heapUsed - startMemory
        };
      }
    };
  }

  /**
   * Log request metrics to database
   */
  async logRequest(metrics) {
    if (!this.enabled) return;

    try {
      await sequelize.query(
        `INSERT INTO performance_metrics 
         (request_id, endpoint, method, duration_ms, query_count, cache_hit, status_code, memory_mb, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        {
          replacements: [
            metrics.requestId,
            metrics.endpoint,
            metrics.method,
            metrics.duration,
            metrics.queryCount || 0,
            metrics.cacheHit || false,
            metrics.statusCode,
            (metrics.memoryUsed / 1024 / 1024).toFixed(2)
          ],
          type: sequelize.QueryTypes.INSERT
        }
      );
    } catch (error) {
      // Don't let monitoring failures affect the application
      console.error('⚠️ Failed to log performance metrics:', error.message);
    }
  }

  /**
   * Log slow query details
   */
  async logSlowQuery(query, duration, params = []) {
    if (!this.enabled) return;

    try {
      console.warn(`🐌 SLOW QUERY (${duration}ms):`, {
        query: query.substring(0, 200),
        duration,
        params: params.length > 0 ? params : 'none'
      });

      // Optionally analyze execution plan
      if (duration > this.verySlowQueryThreshold) {
        try {
          const plan = await sequelize.query(`EXPLAIN QUERY PLAN ${query}`, {
            replacements: params,
            type: sequelize.QueryTypes.SELECT
          });
          console.warn('📊 Execution Plan:', plan);
        } catch (explainError) {
          // Ignore explain errors
        }
      }
    } catch (error) {
      console.error('⚠️ Failed to log slow query:', error.message);
    }
  }

  /**
   * Get aggregated metrics for a time range
   */
  async getMetrics(timeRange = '1 hour') {
    if (!this.enabled) return null;

    try {
      const [results] = await sequelize.query(
        `SELECT 
          COUNT(*) as total_requests,
          AVG(duration_ms) as avg_response_time,
          MIN(duration_ms) as min_response_time,
          MAX(duration_ms) as max_response_time,
          SUM(CASE WHEN cache_hit = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as cache_hit_rate,
          SUM(CASE WHEN duration_ms > ? THEN 1 ELSE 0 END) as slow_query_count,
          SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
         FROM performance_metrics
         WHERE timestamp >= datetime('now', '-${timeRange}')`,
        {
          replacements: [this.slowQueryThreshold],
          type: sequelize.QueryTypes.SELECT
        }
      );

      return results;
    } catch (error) {
      console.error('⚠️ Failed to get metrics:', error.message);
      return null;
    }
  }

  /**
   * Get percentile metrics (p50, p95, p99)
   */
  async getPercentileMetrics(timeRange = '1 hour') {
    if (!this.enabled) return null;

    try {
      const [results] = await sequelize.query(
        `WITH ordered_metrics AS (
          SELECT duration_ms,
                 ROW_NUMBER() OVER (ORDER BY duration_ms) as row_num,
                 COUNT(*) OVER () as total_count
          FROM performance_metrics
          WHERE timestamp >= datetime('now', '-${timeRange}')
        )
        SELECT 
          MAX(CASE WHEN row_num = CAST(total_count * 0.50 AS INTEGER) THEN duration_ms END) as p50,
          MAX(CASE WHEN row_num = CAST(total_count * 0.95 AS INTEGER) THEN duration_ms END) as p95,
          MAX(CASE WHEN row_num = CAST(total_count * 0.99 AS INTEGER) THEN duration_ms END) as p99
        FROM ordered_metrics`,
        {
          type: sequelize.QueryTypes.SELECT
        }
      );

      return results;
    } catch (error) {
      console.error('⚠️ Failed to get percentile metrics:', error.message);
      return null;
    }
  }

  /**
   * Check if metrics exceed alert thresholds
   */
  checkThresholds(metrics) {
    const alerts = [];

    // Slow response alert
    if (metrics.duration > this.slowQueryThreshold) {
      alerts.push({
        type: 'slow_response',
        severity: metrics.duration > this.verySlowQueryThreshold ? 'critical' : 'warning',
        message: `Slow response detected: ${metrics.endpoint} took ${metrics.duration}ms`,
        metrics
      });
    }

    // High error rate alert (if status code is 500+)
    if (metrics.statusCode >= 500) {
      alerts.push({
        type: 'high_error_rate',
        severity: 'critical',
        message: `Server error on ${metrics.endpoint}: ${metrics.statusCode}`,
        metrics
      });
    }

    return alerts;
  }

  /**
   * Get slowest endpoints
   */
  async getSlowestEndpoints(limit = 10, timeRange = '1 hour') {
    if (!this.enabled) return [];

    try {
      const results = await sequelize.query(
        `SELECT 
          endpoint,
          method,
          COUNT(*) as request_count,
          AVG(duration_ms) as avg_duration,
          MAX(duration_ms) as max_duration,
          MIN(duration_ms) as min_duration
         FROM performance_metrics
         WHERE timestamp >= datetime('now', '-${timeRange}')
         GROUP BY endpoint, method
         ORDER BY avg_duration DESC
         LIMIT ?`,
        {
          replacements: [limit],
          type: sequelize.QueryTypes.SELECT
        }
      );

      return results;
    } catch (error) {
      console.error('⚠️ Failed to get slowest endpoints:', error.message);
      return [];
    }
  }

  /**
   * Clean up old metrics (keep last 7 days)
   */
  async cleanupOldMetrics(daysToKeep = 7) {
    if (!this.enabled) return;

    try {
      const [result] = await sequelize.query(
        `DELETE FROM performance_metrics 
         WHERE timestamp < datetime('now', '-${daysToKeep} days')`,
        {
          type: sequelize.QueryTypes.DELETE
        }
      );

      console.log(`🧹 Cleaned up old performance metrics (kept last ${daysToKeep} days)`);
    } catch (error) {
      console.error('⚠️ Failed to cleanup old metrics:', error.message);
    }
  }
}

// Singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;
