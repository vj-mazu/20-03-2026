const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const Outturn = require('../models/Outturn');

/**
 * Property Test 9: API Response Standardization
 * 
 * This property test validates that rice stock API responses are consistently
 * formatted and standardized across all endpoints.
 * 
 * Property: For any rice stock API request:
 * - Response format is consistent and predictable
 * - Variety data follows standardized format
 * - Metadata is consistently included when requested
 * - Error responses follow standard format
 * - Pagination and filtering work consistently
 * 
 * Validates Requirements: 6.1, 6.3, 6.4
 */

describe('Property Test 9: Rice Stock API Response Standardization', () => {
  let authToken;
  let testOutturns = [];

  beforeAll(async () => {
    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'ashish', password: 'ashish789' });
    
    authToken = loginResponse.body.token;

    // Create test outturns for API testing
    const outturnData = [
      { code: 'API_STD_1', allottedVariety: 'BASMATI', type: 'Raw' },
      { code: 'API_STD_2', allottedVariety: 'SONA', type: 'Steam' },
      { code: 'API_STD_3', allottedVariety: 'RNR', type: 'Raw' },
      { code: 'API_STD_4', allottedVariety: 'JSR', type: 'Steam' },
      { code: 'API_STD_5', allottedVariety: 'PUSA', type: 'Raw' }
    ];

    for (const data of outturnData) {
      const outturn = await Outturn.create(data);
      testOutturns.push(outturn);
    }
  });

  afterAll(async () => {
    // Clean up test outturns
    for (const outturn of testOutturns) {
      await outturn.destroy();
    }
  });

  /**
   * Property: Rice stock varieties API returns consistent response format
   */
  test('should return consistent response format for varieties endpoint', async () => {
    const iterations = 20;
    
    for (let i = 0; i < iterations; i++) {
      // Test different parameter combinations
      const params = {
        processing_type: i % 3 === 0 ? 'Raw' : i % 3 === 1 ? 'Steam' : undefined,
        search: i % 4 === 0 ? 'BASMATI' : i % 4 === 1 ? 'SONA' : undefined,
        limit: Math.floor(Math.random() * 50) + 10,
        include_metadata: i % 2 === 0 ? 'true' : 'false'
      };

      // Build query string
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });

      const response = await request(app)
        .get(`/api/rice-stock/varieties?${queryParams.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Property: Response must have consistent top-level structure
      expect(response.body).toHaveProperty('varieties');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('filters');

      // Property: varieties must be an array
      expect(Array.isArray(response.body.varieties)).toBe(true);

      // Property: total must be a number
      expect(typeof response.body.total).toBe('number');

      // Property: filters must reflect request parameters
      expect(response.body.filters).toHaveProperty('processing_type');
      expect(response.body.filters).toHaveProperty('search');
      expect(response.body.filters).toHaveProperty('limit');

      // Property: Each variety must have standardized format
      response.body.varieties.forEach(variety => {
        expect(variety).toHaveProperty('id');
        expect(variety).toHaveProperty('code');
        expect(variety).toHaveProperty('standardized_variety');
        expect(variety).toHaveProperty('allotted_variety');
        expect(variety).toHaveProperty('processing_type');

        // Property: ID must be a number
        expect(typeof variety.id).toBe('number');

        // Property: Code must be a string
        expect(typeof variety.code).toBe('string');

        // Property: Standardized variety must be uppercase
        expect(variety.standardized_variety).toBe(variety.standardized_variety.toUpperCase());

        // Property: Processing type must be valid
        expect(['Raw', 'Steam']).toContain(variety.processing_type);

        // Property: Metadata fields should be present when requested
        if (params.include_metadata === 'true') {
          expect(variety).toHaveProperty('created_at');
          expect(variety).toHaveProperty('is_cleared');
          expect(variety).toHaveProperty('usage_count');
          expect(typeof variety.usage_count).toBe('number');
        } else {
          expect(variety).not.toHaveProperty('usage_count');
        }
      });

      // Property: Filtering should work correctly
      if (params.processing_type) {
        response.body.varieties.forEach(variety => {
          expect(variety.processing_type).toBe(params.processing_type);
        });
      }

      if (params.search) {
        response.body.varieties.forEach(variety => {
          const searchTerm = params.search.toUpperCase();
          const varietyText = variety.standardized_variety.toUpperCase();
          const allottedText = variety.allotted_variety.toUpperCase();
          expect(
            varietyText.includes(searchTerm) || allottedText.includes(searchTerm)
          ).toBe(true);
        });
      }

      // Property: Limit should be respected
      expect(response.body.varieties.length).toBeLessThanOrEqual(params.limit);
    }

    console.log(`✅ Verified consistent API response format across ${iterations} requests`);
  });

  /**
   * Property: Validation API returns consistent response format
   */
  test('should return consistent response format for validation endpoint', async () => {
    const testCases = [
      { outturn_id: testOutturns[0].id, variety_string: undefined },
      { outturn_id: undefined, variety_string: 'BASMATI RAW' },
      { outturn_id: undefined, variety_string: 'NONEXISTENT VARIETY' },
      { outturn_id: 99999, variety_string: undefined }, // Invalid ID
      { outturn_id: testOutturns[1].id, variety_string: 'SONA STEAM' } // Both provided
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/rice-stock/varieties/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testCase)
        .expect(200);

      // Property: Response must have consistent structure
      expect(response.body).toHaveProperty('is_valid');
      expect(response.body).toHaveProperty('outturn_id');
      expect(response.body).toHaveProperty('standardized_variety');
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('error');

      // Property: is_valid must be boolean
      expect(typeof response.body.is_valid).toBe('boolean');

      // Property: suggestions must be array
      expect(Array.isArray(response.body.suggestions)).toBe(true);

      // Property: Each suggestion must have standardized format
      response.body.suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('code');
        expect(suggestion).toHaveProperty('standardized_variety');
        expect(suggestion).toHaveProperty('allotted_variety');
        expect(suggestion).toHaveProperty('processing_type');

        expect(typeof suggestion.id).toBe('number');
        expect(typeof suggestion.code).toBe('string');
        expect(['Raw', 'Steam']).toContain(suggestion.processing_type);
      });

      // Property: Valid responses should have outturn_id and standardized_variety
      if (response.body.is_valid) {
        expect(response.body.outturn_id).toBeTruthy();
        expect(typeof response.body.outturn_id).toBe('number');
        expect(response.body.standardized_variety).toBeTruthy();
        expect(typeof response.body.standardized_variety).toBe('string');
        expect(response.body.error).toBeNull();
      } else {
        expect(response.body.error).toBeTruthy();
        expect(typeof response.body.error).toBe('string');
      }

      console.log(`✅ Verified validation response format for case: ${JSON.stringify(testCase)}`);
    }
  });

  /**
   * Property: Usage statistics API returns consistent response format
   */
  test('should return consistent response format for usage statistics endpoint', async () => {
    const testOutturnId = testOutturns[0].id;
    
    // Test different parameter combinations
    const paramCombinations = [
      {},
      { start_date: '2024-01-01' },
      { end_date: '2024-12-31' },
      { movement_type: 'purchase' },
      { location_code: 'N3' },
      { start_date: '2024-01-01', end_date: '2024-12-31', movement_type: 'sale' }
    ];

    for (const params of paramCombinations) {
      const queryParams = new URLSearchParams(params);
      
      const response = await request(app)
        .get(`/api/rice-stock/varieties/${testOutturnId}/usage?${queryParams.toString()}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Property: Response must have consistent top-level structure
      expect(response.body).toHaveProperty('outturn_id');
      expect(response.body).toHaveProperty('outturn_code');
      expect(response.body).toHaveProperty('standardized_variety');
      expect(response.body).toHaveProperty('summary');
      expect(response.body).toHaveProperty('breakdown_by_movement_type');
      expect(response.body).toHaveProperty('locations');
      expect(response.body).toHaveProperty('movement_types');
      expect(response.body).toHaveProperty('filters');

      // Property: outturn_id must match request
      expect(response.body.outturn_id).toBe(testOutturnId);

      // Property: Summary must have consistent structure
      const summary = response.body.summary;
      expect(summary).toHaveProperty('total_movements');
      expect(summary).toHaveProperty('total_bags');
      expect(summary).toHaveProperty('total_quantity_quintals');
      expect(summary).toHaveProperty('first_movement_date');
      expect(summary).toHaveProperty('last_movement_date');
      expect(summary).toHaveProperty('locations_used');
      expect(summary).toHaveProperty('movement_types_used');

      // Property: All summary numbers must be numbers
      expect(typeof summary.total_movements).toBe('number');
      expect(typeof summary.total_bags).toBe('number');
      expect(typeof summary.total_quantity_quintals).toBe('number');
      expect(typeof summary.locations_used).toBe('number');
      expect(typeof summary.movement_types_used).toBe('number');

      // Property: Breakdown must be array with consistent structure
      expect(Array.isArray(response.body.breakdown_by_movement_type)).toBe(true);
      response.body.breakdown_by_movement_type.forEach(breakdown => {
        expect(breakdown).toHaveProperty('movement_type');
        expect(breakdown).toHaveProperty('movement_count');
        expect(breakdown).toHaveProperty('total_bags');
        expect(breakdown).toHaveProperty('total_quantity_quintals');

        expect(['purchase', 'sale', 'palti']).toContain(breakdown.movement_type);
        expect(typeof breakdown.movement_count).toBe('number');
        expect(typeof breakdown.total_bags).toBe('number');
        expect(typeof breakdown.total_quantity_quintals).toBe('number');
      });

      // Property: Locations and movement_types must be arrays
      expect(Array.isArray(response.body.locations)).toBe(true);
      expect(Array.isArray(response.body.movement_types)).toBe(true);

      // Property: Filters must reflect request parameters
      expect(response.body.filters).toHaveProperty('start_date');
      expect(response.body.filters).toHaveProperty('end_date');
      expect(response.body.filters).toHaveProperty('movement_type');
      expect(response.body.filters).toHaveProperty('location_code');

      console.log(`✅ Verified usage statistics response format for params: ${JSON.stringify(params)}`);
    }
  });

  /**
   * Property: Error responses have consistent format
   */
  test('should return consistent error response format', async () => {
    const errorCases = [
      {
        endpoint: '/api/rice-stock/varieties',
        method: 'get',
        headers: {}, // No auth token
        expectedStatus: 401
      },
      {
        endpoint: '/api/rice-stock/varieties/99999/usage',
        method: 'get',
        headers: { Authorization: `Bearer ${authToken}` },
        expectedStatus: 404
      },
      {
        endpoint: '/api/rice-stock/varieties/validate',
        method: 'post',
        headers: { Authorization: `Bearer ${authToken}` },
        body: {}, // Missing required fields
        expectedStatus: 200 // This endpoint returns 200 with error in body
      }
    ];

    for (const errorCase of errorCases) {
      let response;
      
      if (errorCase.method === 'get') {
        response = await request(app)
          .get(errorCase.endpoint)
          .set(errorCase.headers)
          .expect(errorCase.expectedStatus);
      } else {
        response = await request(app)
          .post(errorCase.endpoint)
          .set(errorCase.headers)
          .send(errorCase.body || {})
          .expect(errorCase.expectedStatus);
      }

      // Property: Error responses should have consistent structure
      if (errorCase.expectedStatus >= 400) {
        expect(response.body).toHaveProperty('error');
        expect(typeof response.body.error).toBe('string');
      } else if (errorCase.endpoint.includes('validate')) {
        // Validation endpoint returns errors in body even with 200 status
        expect(response.body).toHaveProperty('is_valid');
        expect(response.body).toHaveProperty('error');
        if (!response.body.is_valid) {
          expect(response.body.error).toBeTruthy();
        }
      }

      console.log(`✅ Verified error response format for ${errorCase.method.toUpperCase()} ${errorCase.endpoint}`);
    }
  });

  /**
   * Property: Response times are consistent and reasonable
   */
  test('should have consistent and reasonable response times', async () => {
    const iterations = 10;
    const responseTimes = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/rice-stock/varieties?limit=50')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      responseTimes.push(responseTime);
    }

    // Property: Response times should be reasonable (under 5 seconds)
    responseTimes.forEach(time => {
      expect(time).toBeLessThan(5000);
    });

    // Property: Response times should be relatively consistent
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxDeviation = Math.max(...responseTimes.map(time => Math.abs(time - avgResponseTime)));
    
    // Allow up to 2x average as reasonable deviation
    expect(maxDeviation).toBeLessThan(avgResponseTime * 2);

    console.log(`✅ Verified response time consistency: avg ${avgResponseTime.toFixed(2)}ms, max deviation ${maxDeviation.toFixed(2)}ms`);
  });
});