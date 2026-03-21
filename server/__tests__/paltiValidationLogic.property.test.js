const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const LocationBifurcationService = require('../services/LocationBifurcationService');
const Outturn = require('../models/Outturn');
const fc = require('fast-check');

/**
 * Property Test 6: Palti Validation Logic
 * 
 * Feature: rice-stock-palti-bifurcation, Property 6: Palti Validation Logic
 * 
 * This property test validates that palti validation logic works correctly:
 * - Validates sufficient stock at source location
 * - Rejects operations exceeding available stock
 * - Prevents operations from zero/negative stock locations
 * - Validates exact variety-packaging-location combination existence
 * 
 * Validates Requirements: 2.3, 2.5, 4.1, 4.2, 4.3
 */

describe('Property Test 6: Palti Validation Logic', () => {
  let authToken;
  let testOutturns = [];
  let testLocations = [];

  beforeAll(async () => {
    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'ashish', password: 'ashish789' });
    
    authToken = loginResponse.body.token;

    // Create test outturns
    const outturnData = [
      { code: 'PALTI_VAL_1', allottedVariety: 'SUM25 RNR', type: 'Raw' },
      { code: 'PALTI_VAL_2', allottedVariety: 'DEC25 KNM', type: 'Steam' },
      { code: 'PALTI_VAL_3', allottedVariety: 'BASMATI', type: 'Raw' }
    ];

    for (const data of outturnData) {
      const outturn = await Outturn.create(data);
      testOutturns.push(outturn);
    }

    // Get existing locations for testing
    const [locations] = await sequelize.query(
      `SELECT code, name, is_direct_load FROM rice_stock_locations 
       WHERE "isActive" = true ORDER BY code LIMIT 8`
    );
    testLocations = locations;
  });

  afterAll(async () => {
    // Clean up test outturns
    for (const outturn of testOutturns) {
      await outturn.destroy();
    }
  });

  /**
   * Property: Palti validation should correctly validate sufficient stock at source location
   */
  test('palti stock sufficiency validation property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceLocation: fc.constantFrom(...testLocations.map(l => l.code)),
          variety: fc.constantFrom('SUM25 RNR Raw', 'DEC25 KNM Steam', 'BASMATI Raw'),
          outturnId: fc.constantFrom(...testOutturns.map(o => o.id)),
          productType: fc.constantFrom('Rice', 'Bran'),
          requestedBags: fc.integer({ min: 1, max: 1000 }),
          requestedQtls: fc.float({ min: 0.1, max: 50.0 }),
          date: fc.constantFrom(
            '2024-01-15', 
            '2024-02-15',
            new Date().toISOString().split('T')[0]
          )
        }),
        async (testData) => {
          try {
            // Validate palti by location
            const validation = await LocationBifurcationService.validatePaltiByLocation({
              sourceLocation: testData.sourceLocation,
              variety: testData.variety,
              outturnId: testData.outturnId,
              productType: testData.productType,
              requestedBags: testData.requestedBags,
              requestedQtls: testData.requestedQtls,
              date: testData.date
            });

            // Property 1: Validation result should be boolean
            expect(typeof validation.isValid).toBe('boolean');

            // Property 2: Available quantities should be non-negative
            expect(validation.availableBags).toBeGreaterThanOrEqual(0);
            expect(validation.availableQtls).toBeGreaterThanOrEqual(0);

            // Property 3: If validation passes, available stock should be >= requested
            if (validation.isValid) {
              expect(validation.availableBags).toBeGreaterThanOrEqual(testData.requestedBags);
              expect(validation.availableQtls).toBeGreaterThanOrEqual(testData.requestedQtls);
            }

            // Property 4: If validation fails, shortfall should be calculated correctly
            if (!validation.isValid) {
              if (testData.requestedBags > validation.availableBags) {
                expect(validation.bagShortfall).toBe(testData.requestedBags - validation.availableBags);
              }
              if (testData.requestedQtls > validation.availableQtls) {
                expect(validation.qtlShortfall).toBeGreaterThan(0);
              }
            }

            // Property 5: Validation should include required fields
            expect(validation).toHaveProperty('sourceLocation');
            expect(validation).toHaveProperty('locationName');
            expect(validation).toHaveProperty('isDirectLoad');
            expect(validation).toHaveProperty('variety');
            expect(validation).toHaveProperty('productType');
            expect(validation).toHaveProperty('availableBags');
            expect(validation).toHaveProperty('availableQtls');
            expect(validation).toHaveProperty('requestedBags');
            expect(validation).toHaveProperty('requestedQtls');
            expect(validation).toHaveProperty('validation');
            expect(validation).toHaveProperty('message');

            // Property 6: Source location should match input
            expect(validation.sourceLocation).toBe(testData.sourceLocation);

            // Property 7: Requested quantities should match input
            expect(validation.requestedBags).toBe(testData.requestedBags);
            expect(validation.requestedQtls).toBe(testData.requestedQtls);

            // Property 8: Validation status should be consistent with isValid
            if (validation.isValid) {
              expect(validation.validation).toBe('PASSED');
            } else {
              expect(validation.validation).toBe('INSUFFICIENT_STOCK');
            }

          } catch (error) {
            if (error.message && (
              error.message.includes('No stock found') ||
              error.message.includes('Insufficient stock') ||
              error.message.includes('Invalid location')
            )) {
              return true; // Valid error cases
            }
            throw error;
          }
        }
      ),
      { 
        numRuns: 100,
        timeout: 30000,
        verbose: true
      }
    );
  }, 60000);

  /**
   * Property: API endpoint validation should work correctly
   */
  test('palti validation API endpoint property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceLocation: fc.constantFrom(...testLocations.slice(0, 3).map(l => l.code)),
          variety: fc.constantFrom('SUM25 RNR Raw', 'BASMATI Raw'),
          outturnId: fc.constantFrom(...testOutturns.slice(0, 2).map(o => o.id)),
          productType: fc.constant('Rice'),
          requestedBags: fc.integer({ min: 1, max: 100 }),
          requestedQtls: fc.float({ min: 0.1, max: 10.0 }),
          date: fc.constant(new Date().toISOString().split('T')[0])
        }),
        async (testData) => {
          try {
            const response = await request(app)
              .post('/api/rice-stock/validate-palti-location')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                sourceLocation: testData.sourceLocation,
                variety: testData.variety,
                outturnId: testData.outturnId,
                productType: testData.productType,
                requestedBags: testData.requestedBags,
                requestedQtls: testData.requestedQtls,
                date: testData.date
              });

            // Property 1: Response should have success status
            expect([200, 400, 500]).toContain(response.status);

            // Property 2: Response should have consistent structure
            expect(response.body).toHaveProperty('success');
            expect(typeof response.body.success).toBe('boolean');

            if (response.status === 200) {
              // Property 3: Successful response should have data
              expect(response.body).toHaveProperty('data');
              expect(response.body.success).toBe(true);

              const validation = response.body.data;

              // Property 4: Validation data should have required fields
              expect(validation).toHaveProperty('isValid');
              expect(validation).toHaveProperty('sourceLocation');
              expect(validation).toHaveProperty('availableBags');
              expect(validation).toHaveProperty('availableQtls');
              expect(validation).toHaveProperty('requestedBags');
              expect(validation).toHaveProperty('requestedQtls');

              // Property 5: Data types should be correct
              expect(typeof validation.isValid).toBe('boolean');
              expect(typeof validation.sourceLocation).toBe('string');
              expect(typeof validation.availableBags).toBe('number');
              expect(typeof validation.availableQtls).toBe('number');
              expect(typeof validation.requestedBags).toBe('number');
              expect(typeof validation.requestedQtls).toBe('number');

              // Property 6: Source location should match request
              expect(validation.sourceLocation).toBe(testData.sourceLocation);
              expect(validation.requestedBags).toBe(testData.requestedBags);
              expect(validation.requestedQtls).toBe(testData.requestedQtls);
            }

            if (response.status === 400) {
              // Property 7: Error response should have error details
              expect(response.body.success).toBe(false);
              expect(response.body).toHaveProperty('error');
              expect(response.body).toHaveProperty('code');
            }

            // Property 8: Response should include performance metrics
            expect(response.body).toHaveProperty('performance');
            expect(response.body.performance).toHaveProperty('responseTime');

          } catch (error) {
            // Allow for network/server errors
            if (error.code && (error.code === 'ECONNREFUSED' || error.code === 'TIMEOUT')) {
              return true;
            }
            throw error;
          }
        }
      ),
      { 
        numRuns: 50,
        timeout: 25000
      }
    );
  }, 50000);

  /**
   * Property: Zero and negative stock locations should be handled correctly
   */
  test('zero stock location validation property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceLocation: fc.constantFrom(...testLocations.map(l => l.code)),
          variety: fc.constantFrom('NONEXISTENT_VARIETY', 'ZERO_STOCK_VARIETY'),
          productType: fc.constantFrom('Rice', 'Bran'),
          requestedBags: fc.integer({ min: 1, max: 10 }),
          requestedQtls: fc.float({ min: 0.1, max: 5.0 }),
          date: fc.constant(new Date().toISOString().split('T')[0])
        }),
        async (testData) => {
          try {
            const validation = await LocationBifurcationService.validatePaltiByLocation({
              sourceLocation: testData.sourceLocation,
              variety: testData.variety,
              productType: testData.productType,
              requestedBags: testData.requestedBags,
              requestedQtls: testData.requestedQtls,
              date: testData.date
            });

            // Property 1: Validation for non-existent varieties should fail or have zero stock
            if (testData.variety.includes('NONEXISTENT') || testData.variety.includes('ZERO')) {
              expect(validation.availableBags).toBe(0);
              expect(validation.availableQtls).toBe(0);
              expect(validation.isValid).toBe(false);
            }

            // Property 2: Shortfall should be calculated correctly for zero stock
            if (validation.availableBags === 0) {
              expect(validation.bagShortfall).toBe(testData.requestedBags);
            }
            if (validation.availableQtls === 0) {
              expect(validation.qtlShortfall).toBe(testData.requestedQtls);
            }

            // Property 3: Validation message should be appropriate
            if (!validation.isValid) {
              expect(validation.message).toContain('Insufficient stock');
              expect(validation.validation).toBe('INSUFFICIENT_STOCK');
            }

          } catch (error) {
            if (error.message && (
              error.message.includes('No stock found') ||
              error.message.includes('Invalid variety') ||
              error.message.includes('calculation')
            )) {
              return true; // Valid error cases
            }
            throw error;
          }
        }
      ),
      { 
        numRuns: 30,
        timeout: 15000
      }
    );
  }, 30000);

  /**
   * Property: Exact variety-packaging-location combination validation
   */
  test('exact combination validation property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceLocation: fc.constantFrom(...testLocations.slice(0, 3).map(l => l.code)),
          variety: fc.constantFrom('SUM25 RNR Raw', 'DEC25 KNM Steam'),
          outturnId: fc.constantFrom(...testOutturns.slice(0, 2).map(o => o.id)),
          productType: fc.constantFrom('Rice', 'Bran'),
          packagingBrand: fc.constantFrom('Mi Jute Fiber', 'Mi Green', 'White Packet'),
          bagSizeKg: fc.constantFrom(26, 30, 40),
          requestedBags: fc.integer({ min: 1, max: 50 }),
          date: fc.constant(new Date().toISOString().split('T')[0])
        }),
        async (testData) => {
          try {
            const validation = await LocationBifurcationService.validatePaltiByLocation({
              sourceLocation: testData.sourceLocation,
              variety: testData.variety,
              outturnId: testData.outturnId,
              productType: testData.productType,
              packagingBrand: testData.packagingBrand,
              bagSizeKg: testData.bagSizeKg,
              requestedBags: testData.requestedBags,
              date: testData.date
            });

            // Property 1: Validation should include packaging information
            expect(validation).toHaveProperty('packagingName');
            expect(validation).toHaveProperty('bagSizeKg');

            // Property 2: Packaging information should be consistent
            if (validation.packagingName && validation.packagingName !== 'Unknown') {
              expect(typeof validation.packagingName).toBe('string');
            }
            if (validation.bagSizeKg) {
              expect(validation.bagSizeKg).toBeGreaterThan(0);
            }

            // Property 3: Variety should be preserved
            expect(validation.variety).toBeDefined();
            expect(typeof validation.variety).toBe('string');

            // Property 4: Product type should match input
            expect(validation.productType).toBe(testData.productType);

          } catch (error) {
            if (error.message && (
              error.message.includes('No stock found') ||
              error.message.includes('Invalid packaging') ||
              error.message.includes('combination')
            )) {
              return true; // Valid error cases
            }
            throw error;
          }
        }
      ),
      { 
        numRuns: 40,
        timeout: 20000
      }
    );
  }, 40000);

  /**
   * Property: Validation suggestions should be helpful and accurate
   */
  test('validation suggestions property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceLocation: fc.constantFrom(...testLocations.slice(0, 2).map(l => l.code)),
          variety: fc.constantFrom('SUM25 RNR Raw', 'BASMATI Raw'),
          productType: fc.constant('Rice'),
          requestedBags: fc.integer({ min: 100, max: 1000 }), // Intentionally high to trigger failures
          requestedQtls: fc.float({ min: 50.0, max: 100.0 }), // Intentionally high
          date: fc.constant(new Date().toISOString().split('T')[0])
        }),
        async (testData) => {
          try {
            const validation = await LocationBifurcationService.validatePaltiByLocation({
              sourceLocation: testData.sourceLocation,
              variety: testData.variety,
              productType: testData.productType,
              requestedBags: testData.requestedBags,
              requestedQtls: testData.requestedQtls,
              date: testData.date
            });

            // Property 1: If validation fails, suggestions should be provided
            if (!validation.isValid) {
              expect(validation).toHaveProperty('suggestions');
              expect(Array.isArray(validation.suggestions)).toBe(true);

              // Property 2: Suggestions should be helpful
              if (validation.suggestions.length > 0) {
                for (const suggestion of validation.suggestions) {
                  expect(typeof suggestion).toBe('string');
                  expect(suggestion.length).toBeGreaterThan(0);
                }
              }

              // Property 3: If available stock > 0, suggestions should mention reducing quantity
              if (validation.availableBags > 0 || validation.availableQtls > 0) {
                const suggestionText = validation.suggestions.join(' ').toLowerCase();
                expect(suggestionText).toMatch(/reduce|less|available/);
              }
            }

          } catch (error) {
            if (error.message && error.message.includes('No stock found')) {
              return true; // Valid case
            }
            throw error;
          }
        }
      ),
      { 
        numRuns: 25,
        timeout: 12000
      }
    );
  }, 25000);
});