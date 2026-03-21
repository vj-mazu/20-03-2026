const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const Outturn = require('../models/Outturn');

/**
 * Property Test 3: Variety Validation Consistency
 * 
 * This property test validates that rice stock variety validation is consistent,
 * accurate, and provides helpful feedback across all scenarios.
 * 
 * Property: For any variety validation request:
 * - Valid outturns are consistently recognized as valid
 * - Invalid varieties are consistently rejected
 * - Suggestions are relevant and helpful
 * - Validation logic is deterministic
 * - Edge cases are handled gracefully
 * 
 * Validates Requirements: 2.4, 2.5, 8.3
 */

describe('Property Test 3: Rice Stock Variety Validation Consistency', () => {
  let authToken;
  let testOutturns = [];

  beforeAll(async () => {
    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'ashish', password: 'ashish789' });
    
    authToken = loginResponse.body.token;

    // Create test outturns for validation testing
    const outturnData = [
      { code: 'VAL_TEST_1', allottedVariety: 'BASMATI', type: 'Raw' },
      { code: 'VAL_TEST_2', allottedVariety: 'SONA', type: 'Steam' },
      { code: 'VAL_TEST_3', allottedVariety: 'RNR', type: 'Raw' },
      { code: 'VAL_TEST_4', allottedVariety: 'JSR', type: 'Steam' },
      { code: 'VAL_TEST_5', allottedVariety: 'PUSA', type: 'Raw' },
      { code: 'VAL_TEST_6', allottedVariety: 'SHARBATI', type: 'Steam' }
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
   * Property: Valid outturn IDs are consistently recognized as valid
   */
  test('should consistently validate valid outturn IDs', async () => {
    const iterations = 50;
    
    for (let i = 0; i < iterations; i++) {
      // Select random test outturn
      const testOutturn = testOutturns[i % testOutturns.length];
      
      const response = await request(app)
        .post('/api/rice-stock/varieties/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ outturn_id: testOutturn.id })
        .expect(200);

      // Property: Valid outturn ID should always be valid
      expect(response.body.is_valid).toBe(true);
      expect(response.body.outturn_id).toBe(testOutturn.id);
      expect(response.body.standardized_variety).toBeTruthy();
      expect(response.body.error).toBeNull();

      // Property: Standardized variety should match expected format
      const expectedVariety = `${testOutturn.allottedVariety} ${testOutturn.type}`.toUpperCase().trim();
      expect(response.body.standardized_variety).toBe(expectedVariety);

      // Property: No suggestions needed for valid outturns
      expect(response.body.suggestions).toEqual([]);
    }

    console.log(`✅ Verified consistent validation for ${iterations} valid outturn IDs`);
  });

  /**
   * Property: Invalid outturn IDs are consistently rejected
   */
  test('should consistently reject invalid outturn IDs', async () => {
    const invalidIds = [
      99999, // Non-existent ID
      -1,    // Negative ID
      0,     // Zero ID
      null,  // Null ID
      'abc', // String ID
      1.5    // Decimal ID
    ];

    for (const invalidId of invalidIds) {
      const response = await request(app)
        .post('/api/rice-stock/varieties/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ outturn_id: invalidId })
        .expect(200);

      // Property: Invalid outturn ID should always be invalid
      expect(response.body.is_valid).toBe(false);
      expect(response.body.outturn_id).toBeNull();
      expect(response.body.standardized_variety).toBeNull();
      expect(response.body.error).toBeTruthy();
      expect(typeof response.body.error).toBe('string');

      console.log(`✅ Verified rejection of invalid outturn ID: ${invalidId}`);
    }
  });

  /**
   * Property: Valid variety strings are consistently recognized
   */
  test('should consistently validate valid variety strings', async () => {
    const validVarietyStrings = testOutturns.map(outturn => 
      `${outturn.allottedVariety} ${outturn.type}`.toUpperCase().trim()
    );

    for (const varietyString of validVarietyStrings) {
      // Test multiple variations of the same variety
      const variations = [
        varietyString,
        varietyString.toLowerCase(),
        `  ${varietyString}  `, // With whitespace
        varietyString.replace(' ', '   ') // Multiple spaces
      ];

      for (const variation of variations) {
        const response = await request(app)
          .post('/api/rice-stock/varieties/validate')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ variety_string: variation })
          .expect(200);

        // Property: Valid variety string should be recognized regardless of case/whitespace
        expect(response.body.is_valid).toBe(true);
        expect(response.body.outturn_id).toBeTruthy();
        expect(response.body.standardized_variety).toBe(varietyString);
        expect(response.body.error).toBeNull();

        console.log(`✅ Verified validation of variety string variation: "${variation}"`);
      }
    }
  });

  /**
   * Property: Invalid variety strings provide helpful suggestions
   */
  test('should provide helpful suggestions for invalid variety strings', async () => {
    const testCases = [
      {
        input: 'BASMATI', // Missing type
        expectedSuggestions: ['BASMATI RAW', 'BASMATI STEAM']
      },
      {
        input: 'SONA', // Missing type
        expectedSuggestions: ['SONA STEAM', 'SONA RAW']
      },
      {
        input: 'BASMAT RAW', // Typo in variety
        expectedSuggestions: ['BASMATI RAW']
      },
      {
        input: 'RNR STEA', // Typo in type
        expectedSuggestions: ['RNR RAW', 'RNR STEAM']
      },
      {
        input: 'COMPLETELY_UNKNOWN_VARIETY',
        expectedSuggestions: [] // No suggestions for completely unknown
      }
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .post('/api/rice-stock/varieties/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ variety_string: testCase.input })
        .expect(200);

      // Property: Invalid variety should be marked as invalid
      expect(response.body.is_valid).toBe(false);
      expect(response.body.error).toBeTruthy();

      // Property: Suggestions should be provided when available
      expect(Array.isArray(response.body.suggestions)).toBe(true);

      if (testCase.expectedSuggestions.length > 0) {
        expect(response.body.suggestions.length).toBeGreaterThan(0);
        
        // Property: Suggestions should be relevant
        const suggestionVarieties = response.body.suggestions.map(s => s.standardized_variety);
        testCase.expectedSuggestions.forEach(expected => {
          const hasRelevantSuggestion = suggestionVarieties.some(suggestion => 
            suggestion.includes(expected.split(' ')[0]) // Check if variety name is included
          );
          expect(hasRelevantSuggestion).toBe(true);
        });
      }

      // Property: Each suggestion should have proper structure
      response.body.suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('code');
        expect(suggestion).toHaveProperty('standardized_variety');
        expect(suggestion).toHaveProperty('allotted_variety');
        expect(suggestion).toHaveProperty('processing_type');

        expect(typeof suggestion.id).toBe('number');
        expect(['Raw', 'Steam']).toContain(suggestion.processing_type);
      });

      console.log(`✅ Verified suggestions for "${testCase.input}": ${response.body.suggestions.length} suggestions`);
    }
  });

  /**
   * Property: Validation is deterministic (same input produces same output)
   */
  test('should produce deterministic validation results', async () => {
    const testInputs = [
      { outturn_id: testOutturns[0].id },
      { variety_string: 'BASMATI RAW' },
      { variety_string: 'NONEXISTENT VARIETY' },
      { outturn_id: 99999 }
    ];

    for (const input of testInputs) {
      const responses = [];
      
      // Make same request multiple times
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .post('/api/rice-stock/varieties/validate')
          .set('Authorization', `Bearer ${authToken}`)
          .send(input)
          .expect(200);
        
        responses.push(response.body);
      }

      // Property: All responses should be identical
      const firstResponse = responses[0];
      responses.forEach((response, index) => {
        expect(response.is_valid).toBe(firstResponse.is_valid);
        expect(response.outturn_id).toBe(firstResponse.outturn_id);
        expect(response.standardized_variety).toBe(firstResponse.standardized_variety);
        expect(response.error).toBe(firstResponse.error);
        expect(response.suggestions).toEqual(firstResponse.suggestions);
      });

      console.log(`✅ Verified deterministic validation for input: ${JSON.stringify(input)}`);
    }
  });

  /**
   * Property: Edge cases are handled gracefully
   */
  test('should handle edge cases gracefully', async () => {
    const edgeCases = [
      { variety_string: '' }, // Empty string
      { variety_string: '   ' }, // Whitespace only
      { variety_string: null }, // Null value
      { outturn_id: null }, // Null outturn_id
      {}, // Empty request body
      { variety_string: 'A'.repeat(500) }, // Very long string
      { variety_string: 'VARIETY!@#$%^&*()' }, // Special characters
      { outturn_id: 'not_a_number' }, // Invalid type for outturn_id
      { variety_string: 'VARIETY', outturn_id: testOutturns[0].id } // Both provided
    ];

    for (const edgeCase of edgeCases) {
      const response = await request(app)
        .post('/api/rice-stock/varieties/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(edgeCase)
        .expect(200);

      // Property: Response should always have required structure
      expect(response.body).toHaveProperty('is_valid');
      expect(response.body).toHaveProperty('outturn_id');
      expect(response.body).toHaveProperty('standardized_variety');
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('error');

      // Property: is_valid should be boolean
      expect(typeof response.body.is_valid).toBe('boolean');

      // Property: suggestions should always be array
      expect(Array.isArray(response.body.suggestions)).toBe(true);

      // Property: Invalid cases should have error message
      if (!response.body.is_valid) {
        expect(response.body.error).toBeTruthy();
        expect(typeof response.body.error).toBe('string');
      }

      console.log(`✅ Verified graceful handling of edge case: ${JSON.stringify(edgeCase)}`);
    }
  });

  /**
   * Property: Validation performance is consistent
   */
  test('should have consistent validation performance', async () => {
    const iterations = 20;
    const responseTimes = [];

    for (let i = 0; i < iterations; i++) {
      const testInput = i % 2 === 0 
        ? { outturn_id: testOutturns[i % testOutturns.length].id }
        : { variety_string: `TEST_VARIETY_${i}` };

      const startTime = Date.now();
      
      await request(app)
        .post('/api/rice-stock/varieties/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testInput)
        .expect(200);
      
      const endTime = Date.now();
      responseTimes.push(endTime - startTime);
    }

    // Property: All validation requests should complete quickly (under 2 seconds)
    responseTimes.forEach(time => {
      expect(time).toBeLessThan(2000);
    });

    // Property: Performance should be relatively consistent
    const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const maxDeviation = Math.max(...responseTimes.map(time => Math.abs(time - avgTime)));
    
    // Allow reasonable deviation (up to 3x average)
    expect(maxDeviation).toBeLessThan(avgTime * 3);

    console.log(`✅ Verified validation performance: avg ${avgTime.toFixed(2)}ms, max deviation ${maxDeviation.toFixed(2)}ms`);
  });

  /**
   * Property: Validation respects outturn clearing status
   */
  test('should respect outturn clearing status in validation', async () => {
    // Create a test outturn and mark it as cleared
    const clearedOutturn = await Outturn.create({
      code: 'CLEARED_TEST',
      allottedVariety: 'CLEARED_VARIETY',
      type: 'Raw',
      is_cleared: true
    });

    try {
      // Property: Cleared outturns should not be valid for new rice stock operations
      const response = await request(app)
        .post('/api/rice-stock/varieties/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ outturn_id: clearedOutturn.id })
        .expect(200);

      expect(response.body.is_valid).toBe(false);
      expect(response.body.error).toBeTruthy();
      expect(response.body.error.toLowerCase()).toContain('cleared');

      console.log(`✅ Verified that cleared outturn ${clearedOutturn.id} is properly rejected`);

    } finally {
      // Clean up
      await clearedOutturn.destroy();
    }
  });
});