/**
 * Property-Based Tests for Performance Monitoring
 * Validates: Requirements 9.1, 9.2
 */

const fc = require('fast-check');
const PerformanceMonitor = require('../utils/PerformanceMonitor');
const { sequelize } = require('../config/database');

describe('Performance Monitoring - Property-Based Tests', () => {
  beforeAll(async () => {
    // Ensure performance_metrics table exists
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id SERIAL PRIMARY KEY,
          request_id VARCHAR(100) NOT NULL,
          endpoint VARCHAR(500) NOT NULL,
          method VARCHAR(10) NOT NULL,
          duration_ms INTEGER NOT NULL,
          query_count INTEGER DEFAULT 0,
          cache_hit BOOLEAN DEFAULT false,
          status_code INTEGER NOT NULL,
          memory_mb DECIMAL(10, 2) DEFAULT 0,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (error) {
      console.log('Table creation warning:', error.message);
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await sequelize.query('DELETE FROM performance_metrics WHERE request_id LIKE \'test_%\'');
    } catch (error) {
      console.log('Cleanup warning:', error.message);
    }
  });

  /**
   * Property 17: Request Metrics Logging
   * For any API request that is processed, the Performance_Monitor should log 
   * complete metrics including response time, query count, cache hit status, and status code.
   * 
   * Validates: Requirements 9.1
   */
  describe('Property 17: Request Metrics Logging', () => {
    test('should log complete metrics for any valid API request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            requestId: fc.string({ minLength: 5, maxLength: 50 }).map(s => `test_${s}`),
            endpoint: fc.oneof(
              fc.constant('/api/arrivals/pending-list'),
              fc.constant('/api/records/stock'),
              fc.constant('/api/hamali-book'),
              fc.constant('/api/rice-productions'),
              fc.string({ minLength: 5, maxLength: 100 }).map(s => `/api/${s}`)
            ),
            method: fc.oneof(
              fc.constant('GET'),
              fc.constant('POST'),
              fc.constant('PUT'),
              fc.constant('DELETE')
            ),
            duration: fc.integer({ min: 1, max: 5000 }),
            queryCount: fc.integer({ min: 0, max: 50 }),
            cacheHit: fc.boolean(),
            statusCode: fc.oneof(
              fc.constant(200),
              fc.constant(201),
              fc.constant(400),
              fc.constant(404),
              fc.constant(500)
            ),
            memoryUsed: fc.integer({ min: 0, max: 100 * 1024 * 1024 }) // 0-100MB
          }),
          async (metrics) => {
            // Log the request
            await PerformanceMonitor.logRequest(metrics);

            // Verify the metrics were logged
            const [results] = await sequelize.query(
              'SELECT * FROM performance_metrics WHERE request_id = ? ORDER BY timestamp DESC LIMIT 1',
              {
                replacements: [metrics.requestId],
                type: sequelize.QueryTypes.SELECT
              }
            );

            // Assert all required fields are present
            expect(results).toBeDefined();
            expect(results.request_id).toBe(metrics.requestId);
            expect(results.endpoint).toBe(metrics.endpoint);
            expect(results.method).toBe(metrics.method);
            expect(results.duration_ms).toBe(metrics.duration);
            expect(results.query_count).toBe(metrics.queryCount);
            expect(results.cache_hit).toBe(metrics.cacheHit);
            expect(results.status_code).toBe(metrics.statusCode);
            expect(results.timestamp).toBeDefined();

            // Clean up
            await sequelize.query(
              'DELETE FROM performance_metrics WHERE request_id = ?',
              {
                replacements: [metrics.requestId],
                type: sequelize.QueryTypes.DELETE
              }
            );
          }
        ),
        { numRuns: 100 } // Run 100 iterations
      );
    });

    test('should handle concurrent metric logging without data loss', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              requestId: fc.uuid().map(id => `test_concurrent_${id}`), // Use UUID for uniqueness
              endpoint: fc.constant('/api/test'),
              method: fc.constant('GET'),
              duration: fc.integer({ min: 1, max: 1000 }),
              queryCount: fc.integer({ min: 0, max: 10 }),
              cacheHit: fc.boolean(),
              statusCode: fc.constant(200),
              memoryUsed: fc.integer({ min: 0, max: 10 * 1024 * 1024 })
            }),
            { minLength: 5, maxLength: 20 }
          ),
          async (metricsArray) => {
            // Clean up any existing test data first
            const requestIds = metricsArray.map(m => m.requestId);
            await sequelize.query(
              `DELETE FROM performance_metrics WHERE request_id IN (${requestIds.map(() => '?').join(',')})`,
              {
                replacements: requestIds,
                type: sequelize.QueryTypes.DELETE
              }
            );

            // Log all metrics concurrently
            await Promise.all(
              metricsArray.map(metrics => PerformanceMonitor.logRequest(metrics))
            );

            // Verify all metrics were logged
            const [results] = await sequelize.query(
              `SELECT COUNT(*) as count FROM performance_metrics WHERE request_id IN (${requestIds.map(() => '?').join(',')})`,
              {
                replacements: requestIds,
                type: sequelize.QueryTypes.SELECT
              }
            );

            expect(parseInt(results.count)).toBe(metricsArray.length);

            // Clean up
            await sequelize.query(
              `DELETE FROM performance_metrics WHERE request_id IN (${requestIds.map(() => '?').join(',')})`,
              {
                replacements: requestIds,
                type: sequelize.QueryTypes.DELETE
              }
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  /**
   * Property 18: Slow Request Alerting
   * For any API request with response time exceeding 100ms, the Performance_Monitor 
   * should generate an alert with request details and performance metrics.
   * 
   * Validates: Requirements 9.2
   */
  describe('Property 18: Slow Request Alerting', () => {
    test('should generate alerts for requests exceeding slow query threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            requestId: fc.string({ minLength: 5, maxLength: 50 }).map(s => `test_alert_${s}`),
            endpoint: fc.string({ minLength: 5, maxLength: 100 }).map(s => `/api/${s}`),
            method: fc.constant('GET'),
            duration: fc.integer({ min: 101, max: 5000 }), // Always > 100ms
            statusCode: fc.constant(200)
          }),
          async (metrics) => {
            // Check thresholds
            const alerts = PerformanceMonitor.checkThresholds(metrics);

            // Should generate at least one alert for slow response
            expect(alerts.length).toBeGreaterThan(0);
            
            const slowResponseAlert = alerts.find(a => a.type === 'slow_response');
            expect(slowResponseAlert).toBeDefined();
            expect(slowResponseAlert.message).toContain(metrics.endpoint);
            expect(slowResponseAlert.message).toContain(`${metrics.duration}ms`);
            
            // Severity should be 'warning' for 100-1000ms, 'critical' for >1000ms
            if (metrics.duration > 1000) {
              expect(slowResponseAlert.severity).toBe('critical');
            } else {
              expect(slowResponseAlert.severity).toBe('warning');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should NOT generate slow query alerts for fast requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            requestId: fc.string({ minLength: 5, maxLength: 50 }),
            endpoint: fc.string({ minLength: 5, maxLength: 100 }).map(s => `/api/${s}`),
            method: fc.constant('GET'),
            duration: fc.integer({ min: 1, max: 100 }), // Always <= 100ms
            statusCode: fc.constant(200)
          }),
          async (metrics) => {
            // Check thresholds
            const alerts = PerformanceMonitor.checkThresholds(metrics);

            // Should NOT generate slow response alert
            const slowResponseAlert = alerts.find(a => a.type === 'slow_response');
            expect(slowResponseAlert).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    test('should generate critical alerts for server errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            requestId: fc.string({ minLength: 5, maxLength: 50 }),
            endpoint: fc.string({ minLength: 5, maxLength: 100 }).map(s => `/api/${s}`),
            method: fc.constant('GET'),
            duration: fc.integer({ min: 1, max: 1000 }),
            statusCode: fc.integer({ min: 500, max: 599 }) // Server errors
          }),
          async (metrics) => {
            // Check thresholds
            const alerts = PerformanceMonitor.checkThresholds(metrics);

            // Should generate error alert
            const errorAlert = alerts.find(a => a.type === 'high_error_rate');
            expect(errorAlert).toBeDefined();
            expect(errorAlert.severity).toBe('critical');
            expect(errorAlert.message).toContain(metrics.endpoint);
            expect(errorAlert.message).toContain(`${metrics.statusCode}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
