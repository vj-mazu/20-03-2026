/**
 * Property Test: Rice Stock Error Logging Completeness
 * 
 * Validates that rice stock error handling and logging captures
 * all necessary information and provides appropriate user feedback.
 * 
 * Property 13: Error Logging Completeness
 * Validates: Requirements 8.4, 8.5
 */

const { sequelize } = require('../config/database');
const RiceStockErrorHandler = require('../middleware/riceStockErrorHandler');
const fc = require('fast-check');

describe('Property Test: Rice Stock Error Logging', () => {

  beforeAll(async () => {
    // Initialize error logging system
    await RiceStockErrorHandler.initializeErrorLogging();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * Property 13: Error Logging Completeness
   * Tests that error logging captures all necessary information
   */
  test('Property 13: Rice stock error logging captures complete information', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          errorType: fc.oneof(
            fc.constant('SequelizeValidationError'),
            fc.constant('SequelizeDatabaseError'),
            fc.constant('ValidationError'),
            fc.constant('TypeError'),
            fc.constant('ReferenceError')
          ),
          errorMessage: fc.string({ minLength: 10, maxLength: 100 }),
          method: fc.oneof(
            fc.constant('GET'),
            fc.constant('POST'),
            fc.constant('PUT'),
            fc.constant('DELETE')
          ),
          path: fc.oneof(
            fc.constant('/api/rice-stock'),
            fc.constant('/api/rice-stock/varieties'),
            fc.constant('/api/rice-stock/purchase'),
            fc.constant('/api/rice-stock/sale'),
            fc.constant('/api/rice-stock/palti')
          ),
          statusCode: fc.oneof(
            fc.constant(400),
            fc.constant(404),
            fc.constant(500),
            fc.constant(503)
          )
        }),
        
        async (errorData) => {
          console.log(`🧪 Testing error logging with:`, errorData);

          // Create mock error
          const mockError = new Error(errorData.errorMessage);
          mockError.name = errorData.errorType;
          mockError.statusCode = errorData.statusCode;

          // Create mock request
          const mockRequest = createMockRequest(errorData);

          // Test error categorization
          const category = RiceStockErrorHandler.categorizeError(mockError);
          validateErrorCategory(category, mockError);

          // Test error severity assessment
          const severity = RiceStockErrorHandler.getErrorSeverity(mockError);
          validateErrorSeverity(severity);

          // Test user-friendly error generation
          const userError = RiceStockErrorHandler.generateUserFriendlyError(mockError, mockRequest);
          validateUserFriendlyError(userError, mockError, mockRequest);

          // Test request ID generation
          const requestId = RiceStockErrorHandler.generateRequestId();
          validateRequestId(requestId);

          console.log('✅ Error logging validation passed');
        }
      ),
      { 
        numRuns: 25,
        timeout: 15000
      }
    );
  });

  /**
   * Create mock request object
   */
  function createMockRequest(errorData) {
    return {
      method: errorData.method,
      path: errorData.path,
      query: { test: 'query' },
      body: { variety: 'TEST VARIETY', quantity: 100 },
      user: { id: 1, username: 'testuser' },
      headers: { 'user-agent': 'test-agent' },
      ip: '127.0.0.1'
    };
  }

  /**
   * Validate error category
   */
  function validateErrorCategory(category, error) {
    const validCategories = [
      'VARIETY_VALIDATION',
      'OUTTURN_NOT_FOUND',
      'STOCK_INSUFFICIENT',
      'MIGRATION_ERROR',
      'DATABASE_ERROR',
      'VALIDATION_ERROR',
      'UNKNOWN_ERROR'
    ];

    expect(validCategories).toContain(category);
    expect(typeof category).toBe('string');
    expect(category.length).toBeGreaterThan(0);
  }

  /**
   * Validate error severity
   */
  function validateErrorSeverity(severity) {
    const validSeverities = ['low', 'medium', 'high'];
    expect(validSeverities).toContain(severity);
    expect(typeof severity).toBe('string');
  }

  /**
   * Validate user-friendly error response
   */
  function validateUserFriendlyError(userError, originalError, request) {
    // Required fields
    expect(userError).toHaveProperty('error');
    expect(userError).toHaveProperty('requestId');
    expect(userError).toHaveProperty('timestamp');
    expect(userError).toHaveProperty('path');
    expect(userError).toHaveProperty('method');
    expect(userError).toHaveProperty('statusCode');
    expect(userError).toHaveProperty('type');
    expect(userError).toHaveProperty('message');
    expect(userError).toHaveProperty('details');
    expect(userError).toHaveProperty('suggestions');

    // Field types
    expect(userError.error).toBe(true);
    expect(typeof userError.requestId).toBe('string');
    expect(typeof userError.timestamp).toBe('string');
    expect(typeof userError.path).toBe('string');
    expect(typeof userError.method).toBe('string');
    expect(typeof userError.statusCode).toBe('number');
    expect(typeof userError.type).toBe('string');
    expect(typeof userError.message).toBe('string');
    expect(typeof userError.details).toBe('string');
    expect(Array.isArray(userError.suggestions)).toBe(true);

    // Field values
    expect(userError.path).toBe(request.path);
    expect(userError.method).toBe(request.method);
    expect(userError.statusCode).toBeGreaterThanOrEqual(400);
    expect(userError.statusCode).toBeLessThan(600);
    expect(userError.message.length).toBeGreaterThan(0);
    expect(userError.suggestions.length).toBeGreaterThan(0);

    // Timestamp format
    expect(() => new Date(userError.timestamp)).not.toThrow();
  }

  /**
   * Validate request ID format
   */
  function validateRequestId(requestId) {
    expect(typeof requestId).toBe('string');
    expect(requestId).toMatch(/^rice-stock-\d+-[a-z0-9]+$/);
    expect(requestId.length).toBeGreaterThan(20);
  }

  /**
   * Test specific error logging scenarios
   */
  test('Error handler correctly identifies rice stock requests', () => {
    const riceStockPaths = [
      '/api/rice-stock',
      '/api/rice-stock/',
      '/api/rice-stock/varieties',
      '/api/rice-stock/movements',
      '/api/rice-stock/purchase',
      '/api/rice-stock/sale',
      '/api/rice-stock/palti'
    ];

    const nonRiceStockPaths = [
      '/api/arrivals',
      '/api/hamali',
      '/api/locations',
      '/api/users'
    ];

    riceStockPaths.forEach(path => {
      const mockReq = { path };
      expect(RiceStockErrorHandler.isRiceStockRequest(mockReq)).toBe(true);
    });

    nonRiceStockPaths.forEach(path => {
      const mockReq = { path };
      expect(RiceStockErrorHandler.isRiceStockRequest(mockReq)).toBe(false);
    });
  });

  test('Error categorization handles different error types correctly', () => {
    const testCases = [
      {
        error: new Error('Invalid variety specified'),
        expectedCategory: 'VARIETY_VALIDATION'
      },
      {
        error: new Error('Outturn not found'),
        expectedCategory: 'OUTTURN_NOT_FOUND'
      },
      {
        error: new Error('Insufficient stock available'),
        expectedCategory: 'STOCK_INSUFFICIENT'
      },
      {
        error: { name: 'SequelizeConnectionError', message: 'Database connection failed' },
        expectedCategory: 'DATABASE_ERROR'
      },
      {
        error: { name: 'ValidationError', message: 'Validation failed' },
        expectedCategory: 'VALIDATION_ERROR'
      },
      {
        error: new Error('Unknown error occurred'),
        expectedCategory: 'UNKNOWN_ERROR'
      }
    ];

    testCases.forEach(({ error, expectedCategory }) => {
      const category = RiceStockErrorHandler.categorizeError(error);
      expect(category).toBe(expectedCategory);
    });
  });

  test('Error severity assessment is consistent', () => {
    const testCases = [
      { category: 'VARIETY_VALIDATION', expectedSeverity: 'low' },
      { category: 'OUTTURN_NOT_FOUND', expectedSeverity: 'low' },
      { category: 'STOCK_INSUFFICIENT', expectedSeverity: 'medium' },
      { category: 'MIGRATION_ERROR', expectedSeverity: 'high' },
      { category: 'DATABASE_ERROR', expectedSeverity: 'high' },
      { category: 'VALIDATION_ERROR', expectedSeverity: 'low' },
      { category: 'UNKNOWN_ERROR', expectedSeverity: 'medium' }
    ];

    testCases.forEach(({ category, expectedSeverity }) => {
      // Create mock error for each category
      const mockError = { message: category.toLowerCase().replace('_', ' ') };
      const severity = RiceStockErrorHandler.getErrorSeverity(mockError);
      expect(severity).toBe(expectedSeverity);
    });
  });

  test('Request body sanitization removes sensitive data', () => {
    const testBody = {
      variety: 'BPT RAW',
      quantity: 100,
      password: 'secret123',
      token: 'abc123token',
      secret: 'topsecret',
      key: 'apikey123',
      normalField: 'normalValue'
    };

    const sanitized = RiceStockErrorHandler.sanitizeRequestBody(testBody);

    expect(sanitized.variety).toBe('BPT RAW');
    expect(sanitized.quantity).toBe(100);
    expect(sanitized.normalField).toBe('normalValue');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.token).toBe('[REDACTED]');
    expect(sanitized.secret).toBe('[REDACTED]');
    expect(sanitized.key).toBe('[REDACTED]');
  });

  test('Status code determination is accurate', () => {
    const testCases = [
      { error: { statusCode: 404 }, expected: 404 },
      { error: { status: 400 }, expected: 400 },
      { error: { message: 'variety validation failed' }, expected: 400 },
      { error: { message: 'outturn not found' }, expected: 404 },
      { error: { message: 'insufficient stock' }, expected: 400 },
      { error: { name: 'SequelizeConnectionError' }, expected: 503 },
      { error: { message: 'unknown error' }, expected: 500 }
    ];

    testCases.forEach(({ error, expected }) => {
      const statusCode = RiceStockErrorHandler.getErrorStatusCode(error);
      expect(statusCode).toBe(expected);
    });
  });

  test('User-friendly error messages provide helpful information', () => {
    const mockRequest = {
      method: 'POST',
      path: '/api/rice-stock/purchase',
      body: { variety: 'INVALID_VARIETY' }
    };

    const varietyError = new Error('Invalid variety specified');
    const userError = RiceStockErrorHandler.generateUserFriendlyError(varietyError, mockRequest);

    expect(userError.type).toBe('VARIETY_VALIDATION_ERROR');
    expect(userError.message).toContain('variety');
    expect(userError.suggestions.length).toBeGreaterThan(0);
    expect(userError.suggestions.some(s => s.includes('varieties endpoint'))).toBe(true);
  });

  test('Request ID generation produces unique identifiers', () => {
    const ids = new Set();
    const count = 100;

    for (let i = 0; i < count; i++) {
      const id = RiceStockErrorHandler.generateRequestId();
      expect(ids.has(id)).toBe(false); // Should be unique
      ids.add(id);
    }

    expect(ids.size).toBe(count);
  });

  test('Time condition generation for statistics is correct', () => {
    const testCases = [
      { timeframe: '1h', expected: "NOW() - INTERVAL '1 hour'" },
      { timeframe: '24h', expected: "NOW() - INTERVAL '24 hours'" },
      { timeframe: '7d', expected: "NOW() - INTERVAL '7 days'" },
      { timeframe: '30d', expected: "NOW() - INTERVAL '30 days'" },
      { timeframe: 'invalid', expected: "NOW() - INTERVAL '24 hours'" } // Default
    ];

    testCases.forEach(({ timeframe, expected }) => {
      const condition = RiceStockErrorHandler.getTimeCondition(timeframe);
      expect(condition).toBe(expected);
    });
  });
});