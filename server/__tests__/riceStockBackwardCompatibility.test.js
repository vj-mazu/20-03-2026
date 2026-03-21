/**
 * Property Test: Rice Stock Backward Compatibility Preservation
 * 
 * Validates that rice stock backward compatibility layer maintains
 * existing functionality during the transition to outturn-based varieties.
 * 
 * Property 11: Backward Compatibility Preservation
 * Validates: Requirements 7.1, 7.2, 7.4
 */

const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const { generateTestToken } = require('./helpers/testHelpers');
const RiceStockBackwardCompatibilityLayer = require('../middleware/riceStockBackwardCompatibility');
const fc = require('fast-check');

describe('Property Test: Rice Stock Backward Compatibility', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateTestToken();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * Property 11: Backward Compatibility Preservation
   * Tests that backward compatibility layer preserves existing functionality
   */
  test('Property 11: Rice stock backward compatibility preserves existing functionality', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          variety: fc.oneof(
            fc.constant('BPT RAW'),
            fc.constant('SONA STEAM'),
            fc.constant('BASMATI RAW'),
            fc.constant('JSR STEAM'),
            fc.string({ minLength: 3, maxLength: 20 })
          ),
          productType: fc.oneof(
            fc.constant('Rice'),
            fc.constant('Broken'),
            fc.constant('Bran')
          ),
          useLegacyFormat: fc.boolean()
        }),
        
        async (testData) => {
          console.log(`🧪 Testing backward compatibility with:`, testData);

          // Test variety normalization
          const normalizedVariety = RiceStockBackwardCompatibilityLayer.normalizeVariety(testData.variety);
          validateVarietyNormalization(testData.variety, normalizedVariety);

          // Test outturn lookup
          const outturnMatch = await RiceStockBackwardCompatibilityLayer.findOutturnByVariety(testData.variety);
          validateOutturnLookup(testData.variety, outturnMatch);

          // Test data transformation
          const testRequestData = createTestRequestData(testData);
          const transformedData = await RiceStockBackwardCompatibilityLayer.transformIncomingData(testRequestData);
          validateDataTransformation(testRequestData, transformedData);

          // Test compatibility validation
          const compatibilityResult = RiceStockBackwardCompatibilityLayer.validateCompatibility(transformedData);
          validateCompatibilityResult(compatibilityResult, transformedData);

          console.log('✅ Backward compatibility validation passed');
        }
      ),
      { 
        numRuns: 30,
        timeout: 20000
      }
    );
  });

  /**
   * Validate variety normalization
   */
  function validateVarietyNormalization(original, normalized) {
    expect(typeof normalized).toBe('string');
    expect(normalized).toBe(normalized.toUpperCase().trim());
    
    if (original) {
      expect(normalized.length).toBeGreaterThan(0);
      expect(normalized).toContain(original.toUpperCase().trim().split(' ')[0]);
    } else {
      expect(normalized).toBe('');
    }
  }

  /**
   * Validate outturn lookup functionality
   */
  function validateOutturnLookup(variety, outturnMatch) {
    if (outturnMatch) {
      expect(outturnMatch).toHaveProperty('id');
      expect(outturnMatch).toHaveProperty('code');
      expect(outturnMatch).toHaveProperty('allotted_variety');
      expect(typeof outturnMatch.id).toBe('number');
      expect(typeof outturnMatch.code).toBe('string');
      expect(typeof outturnMatch.allotted_variety).toBe('string');
    }
    // null is acceptable for varieties that don't match any outturn
  }

  /**
   * Validate data transformation
   */
  function validateDataTransformation(original, transformed) {
    expect(transformed).toHaveProperty('variety');
    expect(typeof transformed.variety).toBe('string');
    
    // Original variety should be preserved or enhanced
    if (original.variety) {
      expect(transformed.variety).toBeTruthy();
    }

    // If outturn mapping occurred, should have outturnId
    if (transformed.outturnId) {
      expect(typeof transformed.outturnId).toBe('number');
      expect(transformed._originalVariety).toBe(original.variety);
    }

    // Preserve other fields
    Object.keys(original).forEach(key => {
      if (key !== 'variety') {
        expect(transformed[key]).toEqual(original[key]);
      }
    });
  }

  /**
   * Validate compatibility result
   */
  function validateCompatibilityResult(result, data) {
    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('issues');
    expect(result).toHaveProperty('hasLegacyFields');
    expect(result).toHaveProperty('hasModernFields');
    
    expect(typeof result.isValid).toBe('boolean');
    expect(Array.isArray(result.issues)).toBe(true);
    expect(typeof result.hasLegacyFields).toBe('boolean');
    expect(typeof result.hasModernFields).toBe('boolean');

    // If data has variety or outturnId, should have modern fields
    if (data.variety || data.outturnId) {
      expect(result.hasModernFields).toBe(true);
    }
  }

  /**
   * Create test request data
   */
  function createTestRequestData(testData) {
    const baseData = {
      variety: testData.variety,
      productType: testData.productType,
      quantity: 100,
      bags: 10
    };

    if (testData.useLegacyFormat) {
      // Add legacy field names
      return {
        ...baseData,
        varietyName: testData.variety,
        riceVariety: testData.variety
      };
    }

    return baseData;
  }

  /**
   * Test specific backward compatibility scenarios
   */
  test('Backward compatibility handles legacy field mappings correctly', async () => {
    const legacyData = {
      varietyName: 'BPT RAW',
      riceVariety: 'SONA STEAM',
      productType: 'Rice',
      quantity: 50
    };

    const transformedData = RiceStockBackwardCompatibilityLayer.transformLegacyData(legacyData);

    expect(transformedData.variety).toBeTruthy();
    expect(transformedData._isLegacyData).toBe(true);
    expect(transformedData._transformedAt).toBeDefined();
    expect(transformedData._legacy_varietyName).toBe('BPT RAW');
  });

  test('Backward compatibility ensures variety compatibility during transition', async () => {
    const testCases = [
      { variety: 'BPT RAW', outturnId: null },
      { variety: null, outturnId: 105 },
      { variety: 'SONA STEAM', outturnId: 106 }
    ];

    for (const testCase of testCases) {
      const enhanced = await RiceStockBackwardCompatibilityLayer.ensureVarietyCompatibility(testCase);
      
      // Should have both variety and outturnId when possible
      expect(enhanced.variety || enhanced.outturnId).toBeTruthy();
      
      if (enhanced._varietyFromOutturn) {
        expect(enhanced.variety).toBeTruthy();
        expect(enhanced.outturnId).toBeTruthy();
      }
      
      if (enhanced._outturnFromVariety) {
        expect(enhanced.variety).toBeTruthy();
        expect(enhanced.outturnId).toBeTruthy();
      }
    }
  });

  test('Backward compatibility status reflects migration progress', async () => {
    const status = await RiceStockBackwardCompatibilityLayer.getCompatibilityStatus();
    
    expect(status).toHaveProperty('totalRecords');
    expect(status).toHaveProperty('outturnBased');
    expect(status).toHaveProperty('stringBased');
    expect(status).toHaveProperty('missingVariety');
    expect(status).toHaveProperty('migrationProgress');
    expect(status).toHaveProperty('isFullyMigrated');
    expect(status).toHaveProperty('needsCompatibilityLayer');
    expect(status).toHaveProperty('status');

    expect(typeof status.totalRecords).toBe('number');
    expect(typeof status.outturnBased).toBe('number');
    expect(typeof status.stringBased).toBe('number');
    expect(typeof status.missingVariety).toBe('number');
    expect(typeof status.migrationProgress).toBe('string');
    expect(typeof status.isFullyMigrated).toBe('boolean');
    expect(typeof status.needsCompatibilityLayer).toBe('boolean');
    expect(['completed', 'in_progress', 'not_started', 'unknown']).toContain(status.status);

    // Validate progress calculation
    const calculatedProgress = status.totalRecords > 0 ? 
      (status.outturnBased / status.totalRecords) * 100 : 0;
    expect(parseFloat(status.migrationProgress)).toBeCloseTo(calculatedProgress, 1);
  });

  test('Backward compatibility middleware transforms responses correctly', async () => {
    // Test rice stock varieties endpoint
    const varietiesResponse = await request(app)
      .get('/api/rice-stock/varieties')
      .set('Authorization', `Bearer ${authToken}`);

    if (varietiesResponse.status === 200 && varietiesResponse.body.varieties) {
      varietiesResponse.body.varieties.forEach(variety => {
        // Should have backward compatibility fields
        expect(variety).toHaveProperty('variety');
        expect(variety).toHaveProperty('displayName');
        expect(variety).toHaveProperty('isLegacy');
        expect(variety).toHaveProperty('migrationStatus');
        
        expect(typeof variety.isLegacy).toBe('boolean');
        expect(['migrated', 'legacy']).toContain(variety.migrationStatus);
      });
    }
  });

  test('Backward compatibility validates data correctly across different formats', async () => {
    const testCases = [
      { variety: 'BPT RAW' }, // Modern format
      { outturnId: 105 }, // Outturn-based format
      { variety: 'SONA STEAM', outturnId: 106 }, // Hybrid format
      { varietyName: 'JSR RAW' }, // Legacy format
      {}, // Empty data
      { variety: '', outturnId: null } // Invalid data
    ];

    testCases.forEach((testCase, index) => {
      const validation = RiceStockBackwardCompatibilityLayer.validateCompatibility(testCase);
      
      expect(validation).toHaveProperty('isValid');
      expect(validation).toHaveProperty('issues');
      expect(Array.isArray(validation.issues)).toBe(true);
      
      console.log(`Test case ${index + 1}: ${validation.isValid ? 'Valid' : 'Invalid'} - ${validation.issues.length} issues`);
    });
  });

  test('Backward compatibility endpoint detection works correctly', () => {
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
      '/api/users',
      '/api/auth'
    ];

    riceStockPaths.forEach(path => {
      expect(RiceStockBackwardCompatibilityLayer.isRiceStockEndpoint(path)).toBe(true);
    });

    nonRiceStockPaths.forEach(path => {
      expect(RiceStockBackwardCompatibilityLayer.isRiceStockEndpoint(path)).toBe(false);
    });
  });
});