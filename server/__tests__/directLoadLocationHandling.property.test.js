const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const LocationBifurcationService = require('../services/LocationBifurcationService');
const RiceStockCalculationService = require('../services/riceStockCalculationService');
const Outturn = require('../models/Outturn');
const fc = require('fast-check');

/**
 * Property Test 9: Direct Load Location Handling
 * 
 * Feature: rice-stock-palti-bifurcation, Property 9: Direct Load Location Handling
 * 
 * This property test validates that direct_load locations are handled correctly:
 * - Direct_load locations are properly identified in palti operations
 * - Direct_load rules are applied (stock does not carry over to next day)
 * - Direct_load locations are excluded from opening stock calculations
 * - Palti operations FROM and TO direct_load locations work correctly
 * 
 * Validates Requirements: 9.1, 9.2, 9.3, 9.4, 9.6, 9.7
 */

describe('Property Test 9: Direct Load Location Handling', () => {
  let authToken;
  let testOutturns = [];
  let directLoadLocation = null;
  let regularLocations = [];

  beforeAll(async () => {
    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'ashish', password: 'ashish789' });
    
    authToken = loginResponse.body.token;

    // Create test outturns
    const outturnData = [
      { code: 'DL_TEST_1', allottedVariety: 'SUM25 RNR', type: 'Raw' },
      { code: 'DL_TEST_2', allottedVariety: 'DEC25 KNM', type: 'Steam' }
    ];

    for (const data of outturnData) {
      const outturn = await Outturn.create(data);
      testOutturns.push(outturn);
    }

    // Get DIRECT_LOAD location
    const [directLoadResult] = await sequelize.query(
      `SELECT code, name, is_direct_load FROM rice_stock_locations WHERE code = 'DIRECT_LOAD' LIMIT 1`
    );
    if (directLoadResult.length > 0) {
      directLoadLocation = directLoadResult[0];
    }

    // Get regular locations (non-direct_load)
    const [regularResult] = await sequelize.query(
      `SELECT code, name, is_direct_load FROM rice_stock_locations 
       WHERE is_direct_load = false AND "isActive" = true 
       ORDER BY code LIMIT 5`
    );
    regularLocations = regularResult;
  });

  afterAll(async () => {
    // Clean up test outturns
    for (const outturn of testOutturns) {
      await outturn.destroy();
    }
  });

  /**
   * Property: Direct_load locations should be properly identified in location bifurcation
   */
  test('direct load location identification property', async () => {
    // Skip if no DIRECT_LOAD location exists
    if (!directLoadLocation) {
      console.log('⚠️ Skipping direct load test - DIRECT_LOAD location not found');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          variety: fc.constantFrom('SUM25 RNR Raw', 'DEC25 KNM Steam'),
          outturnId: fc.constantFrom(...testOutturns.map(o => o.id)),
          productType: fc.constantFrom('Rice', 'Bran'),
          date: fc.constantFrom(
            '2024-01-15', 
            new Date().toISOString().split('T')[0]
          )
        }),
        async (testData) => {
          try {
            // Get location breakdown
            const locationBreakdown = await LocationBifurcationService.getLocationStockBreakdown({
              variety: testData.variety,
              outturnId: testData.outturnId,
              productType: testData.productType,
              date: testData.date
            });

            // Property 1: Direct_load locations should be properly identified
            for (const location of locationBreakdown.locationBreakdown) {
              if (location.locationCode === 'DIRECT_LOAD') {
                expect(location.isDirectLoad).toBe(true);
                expect(location.locationName).toBe('Direct Load');
              } else {
                // Regular locations should not be marked as direct_load
                expect(location.isDirectLoad).toBe(false);
              }
            }

            // Property 2: Direct load count should match actual direct_load locations
            const actualDirectLoadCount = locationBreakdown.locationBreakdown.filter(
              loc => loc.isDirectLoad
            ).length;
            expect(locationBreakdown.totals.directLoadLocations).toBe(actualDirectLoadCount);

            // Property 3: Regular location count should match non-direct_load locations
            const actualRegularCount = locationBreakdown.locationBreakdown.filter(
              loc => !loc.isDirectLoad
            ).length;
            expect(locationBreakdown.totals.regularLocations).toBe(actualRegularCount);

          } catch (error) {
            if (error.message && error.message.includes('No stock found')) {
              return true; // Valid case
            }
            throw error;
          }
        }
      ),
      { 
        numRuns: 50,
        timeout: 20000
      }
    );
  }, 40000);

  /**
   * Property: Palti validation should correctly handle direct_load locations
   */
  test('direct load palti validation property', async () => {
    // Skip if no locations available
    if (!directLoadLocation || regularLocations.length === 0) {
      console.log('⚠️ Skipping direct load palti validation test - insufficient locations');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceLocation: fc.constantFrom('DIRECT_LOAD', ...regularLocations.map(l => l.code)),
          variety: fc.constantFrom('SUM25 RNR Raw', 'DEC25 KNM Steam'),
          outturnId: fc.constantFrom(...testOutturns.map(o => o.id)),
          productType: fc.constant('Rice'),
          requestedBags: fc.integer({ min: 1, max: 10 }),
          requestedQtls: fc.float({ min: 0.1, max: 5.0 }),
          date: fc.constant(new Date().toISOString().split('T')[0])
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

            // Property 1: Direct_load location should be properly identified
            if (testData.sourceLocation === 'DIRECT_LOAD') {
              expect(validation.isDirectLoad).toBe(true);
              expect(validation.locationName).toBe('Direct Load');
            } else {
              expect(validation.isDirectLoad).toBe(false);
            }

            // Property 2: Validation should include location information
            expect(validation).toHaveProperty('sourceLocation');
            expect(validation).toHaveProperty('locationName');
            expect(validation).toHaveProperty('isDirectLoad');
            expect(validation.sourceLocation).toBe(testData.sourceLocation);

            // Property 3: Validation should be boolean
            expect(typeof validation.isValid).toBe('boolean');

            // Property 4: Available quantities should be non-negative
            expect(validation.availableBags).toBeGreaterThanOrEqual(0);
            expect(validation.availableQtls).toBeGreaterThanOrEqual(0);

          } catch (error) {
            if (error.message && (
              error.message.includes('No stock found') ||
              error.message.includes('Insufficient stock')
            )) {
              return true; // Valid cases
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
   * Property: Opening stock calculations should exclude direct_load locations
   */
  test('direct load opening stock exclusion property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          beforeDate: fc.constantFrom(
            '2024-01-16', 
            '2024-02-16', 
            new Date().toISOString().split('T')[0]
          )
        }),
        async (testData) => {
          try {
            // Calculate opening stock balance
            const openingStock = await RiceStockCalculationService.calculateOpeningStockBalance(
              testData.beforeDate
            );

            // Property 1: Opening stock should not include direct_load locations
            for (const [key, stockData] of Object.entries(openingStock)) {
              // Key format: location|variety|category|brand|bagSize
              const keyParts = key.split('|');
              const locationCode = keyParts[0];
              
              // Direct_load locations should be excluded from opening stock
              expect(locationCode.toLowerCase()).not.toBe('direct load');
              expect(locationCode.toLowerCase()).not.toBe('direct_load');
            }

            // Property 2: All stock entries should have positive quantities
            for (const [key, stockData] of Object.entries(openingStock)) {
              expect(stockData.bags).toBeGreaterThanOrEqual(0);
              expect(stockData.quintals).toBeGreaterThanOrEqual(0);
            }

          } catch (error) {
            if (error.message && error.message.includes('No opening stock')) {
              return true; // Valid case
            }
            throw error;
          }
        }
      ),
      { 
        numRuns: 20,
        timeout: 10000
      }
    );
  }, 20000);

  /**
   * Property: Stock updates should handle direct_load locations correctly
   */
  test('direct load stock update property', async () => {
    // Skip if no locations available
    if (!directLoadLocation || regularLocations.length === 0) {
      console.log('⚠️ Skipping direct load stock update test - insufficient locations');
      return;
    }

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          sourceLocation: fc.constantFrom('DIRECT_LOAD', regularLocations[0]?.code || 'B4'),
          targetLocation: fc.constantFrom('DIRECT_LOAD', regularLocations[0]?.code || 'B4'),
          variety: fc.constantFrom('SUM25 RNR Raw', 'DEC25 KNM Steam'),
          outturnId: fc.constantFrom(...testOutturns.map(o => o.id)),
          productType: fc.constant('Rice'),
          bags: fc.integer({ min: 1, max: 5 }),
          quantityQuintals: fc.float({ min: 0.1, max: 2.0 }),
          date: fc.constant(new Date().toISOString().split('T')[0])
        }),
        async (testData) => {
          try {
            // Ensure source and target are different for meaningful test
            if (testData.sourceLocation === testData.targetLocation) {
              testData.targetLocation = testData.sourceLocation === 'DIRECT_LOAD' 
                ? (regularLocations[0]?.code || 'B4')
                : 'DIRECT_LOAD';
            }

            // Update stock after palti
            const updateResult = await LocationBifurcationService.updateStockAfterPalti({
              sourceLocation: testData.sourceLocation,
              targetLocation: testData.targetLocation,
              variety: testData.variety,
              outturnId: testData.outturnId,
              productType: testData.productType,
              sourcePackagingId: 1, // Use default packaging
              targetPackagingId: 1,
              bags: testData.bags,
              quantityQuintals: testData.quantityQuintals,
              date: testData.date
            });

            // Property 1: Update should indicate success
            expect(updateResult.sourceUpdated).toBe(true);
            expect(updateResult.targetUpdated).toBe(true);

            // Property 2: Source and target locations should be recorded
            expect(updateResult.sourceLocation).toBe(testData.sourceLocation);
            expect(updateResult.targetLocation).toBe(testData.targetLocation);

            // Property 3: New balances should be provided
            expect(updateResult.newBalances).toHaveProperty('source');
            expect(updateResult.newBalances).toHaveProperty('target');

            // Property 4: Source balance should have valid structure
            expect(updateResult.newBalances.source).toHaveProperty('locationCode');
            expect(updateResult.newBalances.source).toHaveProperty('availableBags');
            expect(updateResult.newBalances.source).toHaveProperty('availableQtls');
            expect(updateResult.newBalances.source.locationCode).toBe(testData.sourceLocation);

            // Property 5: Target balance should have valid structure
            expect(updateResult.newBalances.target).toHaveProperty('locationCode');
            expect(updateResult.newBalances.target).toHaveProperty('availableBags');
            expect(updateResult.newBalances.target).toHaveProperty('availableQtls');
            expect(updateResult.newBalances.target.locationCode).toBe(testData.targetLocation);

            // Property 6: Palti operation details should be recorded
            expect(updateResult.paltiOperation).toHaveProperty('variety');
            expect(updateResult.paltiOperation).toHaveProperty('productType');
            expect(updateResult.paltiOperation).toHaveProperty('bags');
            expect(updateResult.paltiOperation).toHaveProperty('quantityQuintals');

          } catch (error) {
            if (error.message && (
              error.message.includes('No stock found') ||
              error.message.includes('Insufficient stock') ||
              error.message.includes('calculation')
            )) {
              return true; // Valid cases
            }
            throw error;
          }
        }
      ),
      { 
        numRuns: 20,
        timeout: 15000
      }
    );
  }, 30000);

  /**
   * Property: Available locations for variety should correctly identify direct_load
   */
  test('direct load available locations property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          variety: fc.constantFrom('SUM25 RNR Raw', 'DEC25 KNM Steam'),
          outturnId: fc.constantFrom(...testOutturns.map(o => o.id)),
          productType: fc.constantFrom('Rice', 'Bran'),
          date: fc.constant(new Date().toISOString().split('T')[0])
        }),
        async (testData) => {
          try {
            // Get available locations
            const availableLocations = await LocationBifurcationService.getAvailableLocationsForVariety({
              variety: testData.variety,
              outturnId: testData.outturnId,
              productType: testData.productType,
              date: testData.date
            });

            // Property 1: Direct_load locations should be properly identified
            for (const location of availableLocations) {
              if (location.locationCode === 'DIRECT_LOAD') {
                expect(location.isDirectLoad).toBe(true);
                expect(location.locationName).toBe('Direct Load');
              } else {
                expect(location.isDirectLoad).toBe(false);
              }
            }

            // Property 2: All locations should have required properties
            for (const location of availableLocations) {
              expect(location).toHaveProperty('locationCode');
              expect(location).toHaveProperty('locationName');
              expect(location).toHaveProperty('isDirectLoad');
              expect(location).toHaveProperty('availableBags');
              expect(location).toHaveProperty('availableQtls');

              // Validate data types
              expect(typeof location.locationCode).toBe('string');
              expect(typeof location.locationName).toBe('string');
              expect(typeof location.isDirectLoad).toBe('boolean');
              expect(typeof location.availableBags).toBe('number');
              expect(typeof location.availableQtls).toBe('number');
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