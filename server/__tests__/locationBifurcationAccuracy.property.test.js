const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const LocationBifurcationService = require('../services/LocationBifurcationService');
const RiceStockCalculationService = require('../services/riceStockCalculationService');
const Outturn = require('../models/Outturn');
const fc = require('fast-check');

/**
 * Property Test 1: Location Stock Display Accuracy
 * 
 * Feature: rice-stock-palti-bifurcation, Property 1: Location Stock Display Accuracy
 * 
 * This property test validates that location stock displays are accurate and consistent:
 * - All displayed locations have positive stock quantities that match calculated balances
 * - Locations are sorted alphabetically
 * - Quantities displayed match individual stock calculations
 * - Only locations with positive stock are shown
 * 
 * Validates Requirements: 1.1, 1.2, 1.5, 1.7, 2.2
 */

describe('Property Test 1: Location Stock Display Accuracy', () => {
  let authToken;
  let testOutturns = [];
  let testLocations = [];

  beforeAll(async () => {
    // Get auth token
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({ username: 'ashish', password: 'ashish789' });
    
    authToken = loginResponse.body.token;

    // Create test outturns for property testing
    const outturnData = [
      { code: 'LOC_TEST_1', allottedVariety: 'SUM25 RNR', type: 'Raw' },
      { code: 'LOC_TEST_2', allottedVariety: 'DEC25 KNM', type: 'Steam' },
      { code: 'LOC_TEST_3', allottedVariety: 'BASMATI', type: 'Raw' },
      { code: 'LOC_TEST_4', allottedVariety: 'P SONA', type: 'Steam' }
    ];

    for (const data of outturnData) {
      const outturn = await Outturn.create(data);
      testOutturns.push(outturn);
    }

    // Get existing locations for testing
    const [locations] = await sequelize.query(
      'SELECT code, name, is_direct_load FROM rice_stock_locations WHERE "isActive" = true ORDER BY code LIMIT 10'
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
   * Property: For any variety-packaging combination, all displayed locations should have 
   * positive stock quantities that match calculated balances, and locations should be sorted alphabetically
   */
  test('location stock display accuracy property', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test data
        fc.record({
          variety: fc.constantFrom('SUM25 RNR Raw', 'DEC25 KNM Steam', 'BASMATI Raw', 'P SONA Steam'),
          outturnId: fc.constantFrom(...testOutturns.map(o => o.id)),
          productType: fc.constantFrom('Rice', 'Bran', 'Broken'),
          packagingBrand: fc.constantFrom('Mi Jute Fiber', 'Mi Green', 'Mi Blue', 'White Packet'),
          bagSizeKg: fc.constantFrom(26, 30, 40, 55),
          date: fc.constantFrom(
            '2024-01-15', 
            '2024-02-15', 
            '2024-03-15',
            new Date().toISOString().split('T')[0]
          )
        }),
        async (testData) => {
          try {
            // Get location stock breakdown
            const locationBreakdown = await LocationBifurcationService.getLocationStockBreakdown({
              variety: testData.variety,
              outturnId: testData.outturnId,
              productType: testData.productType,
              packagingBrand: testData.packagingBrand,
              bagSizeKg: testData.bagSizeKg,
              date: testData.date,
              debugMode: false
            });

            // Property 1: All displayed locations should have positive stock
            for (const location of locationBreakdown.locationBreakdown) {
              expect(location.availableBags).toBeGreaterThan(0);
              expect(location.availableQtls).toBeGreaterThan(0);
            }

            // Property 2: Locations should be sorted alphabetically
            const locationCodes = locationBreakdown.locationBreakdown.map(l => l.locationCode);
            const sortedLocationCodes = [...locationCodes].sort();
            expect(locationCodes).toEqual(sortedLocationCodes);

            // Property 3: Each displayed quantity should match individual calculation
            for (const location of locationBreakdown.locationBreakdown) {
              const individualStock = await RiceStockCalculationService.calculateStockBalance({
                locationCode: location.locationCode,
                variety: testData.variety,
                outturnId: testData.outturnId,
                productType: testData.productType,
                packagingBrand: testData.packagingBrand,
                bagSizeKg: testData.bagSizeKg,
                date: testData.date
              });

              // Allow small floating point differences
              expect(Math.abs(location.availableQtls - individualStock.availableQtls)).toBeLessThan(0.01);
              expect(location.availableBags).toBe(individualStock.availableBags);
            }

            // Property 4: Response should include required information
            for (const location of locationBreakdown.locationBreakdown) {
              expect(location).toHaveProperty('locationCode');
              expect(location).toHaveProperty('locationName');
              expect(location).toHaveProperty('isDirectLoad');
              expect(location).toHaveProperty('packagingName');
              expect(location).toHaveProperty('bagSizeKg');
              expect(location).toHaveProperty('availableBags');
              expect(location).toHaveProperty('availableQtls');
              expect(location).toHaveProperty('groupingKey');

              // Validate data types
              expect(typeof location.locationCode).toBe('string');
              expect(typeof location.locationName).toBe('string');
              expect(typeof location.isDirectLoad).toBe('boolean');
              expect(typeof location.packagingName).toBe('string');
              expect(typeof location.bagSizeKg).toBe('number');
              expect(typeof location.availableBags).toBe('number');
              expect(typeof location.availableQtls).toBe('number');
              expect(typeof location.groupingKey).toBe('string');
            }

            // Property 5: Totals should match sum of individual locations
            const expectedTotalBags = locationBreakdown.locationBreakdown.reduce((sum, loc) => sum + loc.availableBags, 0);
            const expectedTotalQtls = locationBreakdown.locationBreakdown.reduce((sum, loc) => sum + loc.availableQtls, 0);
            
            expect(locationBreakdown.totals.totalBags).toBe(expectedTotalBags);
            expect(Math.abs(locationBreakdown.totals.totalQtls - expectedTotalQtls)).toBeLessThan(0.01);

            // Property 6: Unique locations count should match array length
            expect(locationBreakdown.totals.uniqueLocations).toBe(locationBreakdown.locationBreakdown.length);

            // Property 7: Direct load locations should be properly identified
            const directLoadCount = locationBreakdown.locationBreakdown.filter(loc => loc.isDirectLoad).length;
            const regularCount = locationBreakdown.locationBreakdown.filter(loc => !loc.isDirectLoad).length;
            
            expect(locationBreakdown.totals.directLoadLocations).toBe(directLoadCount);
            expect(locationBreakdown.totals.regularLocations).toBe(regularCount);
            expect(directLoadCount + regularCount).toBe(locationBreakdown.locationBreakdown.length);

          } catch (error) {
            // Allow for cases where no stock exists (empty results are valid)
            if (error.message && error.message.includes('No stock found')) {
              return true; // This is a valid case
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
   * Property: Location selection interface should show accurate quantities for specific combinations
   */
  test('location selection accuracy property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          variety: fc.constantFrom('SUM25 RNR Raw', 'DEC25 KNM Steam', 'BASMATI Raw'),
          outturnId: fc.constantFrom(...testOutturns.map(o => o.id)),
          productType: fc.constantFrom('Rice', 'Bran'),
          date: fc.constantFrom(
            '2024-01-15', 
            new Date().toISOString().split('T')[0]
          )
        }),
        async (testData) => {
          try {
            // Get available locations for variety
            const availableLocations = await LocationBifurcationService.getAvailableLocationsForVariety({
              variety: testData.variety,
              outturnId: testData.outturnId,
              productType: testData.productType,
              date: testData.date
            });

            // Property: All returned locations should have positive stock
            for (const location of availableLocations) {
              expect(location.availableBags).toBeGreaterThan(0);
              expect(location.availableQtls).toBeGreaterThan(0);
            }

            // Property: Locations should be sorted alphabetically
            const locationCodes = availableLocations.map(l => l.locationCode);
            const sortedLocationCodes = [...locationCodes].sort();
            expect(locationCodes).toEqual(sortedLocationCodes);

            // Property: Each location should have required properties
            for (const location of availableLocations) {
              expect(location).toHaveProperty('locationCode');
              expect(location).toHaveProperty('locationName');
              expect(location).toHaveProperty('isDirectLoad');
              expect(location).toHaveProperty('availableBags');
              expect(location).toHaveProperty('availableQtls');
              expect(location).toHaveProperty('packagingName');
              expect(location).toHaveProperty('bagSizeKg');

              // Validate data types
              expect(typeof location.locationCode).toBe('string');
              expect(typeof location.locationName).toBe('string');
              expect(typeof location.isDirectLoad).toBe('boolean');
              expect(typeof location.availableBags).toBe('number');
              expect(typeof location.availableQtls).toBe('number');
              expect(typeof location.packagingName).toBe('string');
              expect(typeof location.bagSizeKg).toBe('number');
            }

          } catch (error) {
            // Allow for cases where no stock exists
            if (error.message && error.message.includes('No stock found')) {
              return true;
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
   * Property: Packaging details should be consistently included in location displays
   */
  test('packaging information completeness property', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          variety: fc.constantFrom('SUM25 RNR Raw', 'BASMATI Raw'),
          outturnId: fc.constantFrom(...testOutturns.slice(0, 2).map(o => o.id)),
          productType: fc.constant('Rice'),
          packagingBrand: fc.constantFrom('Mi Jute Fiber', 'Mi Green'),
          bagSizeKg: fc.constantFrom(26, 30),
          date: fc.constant(new Date().toISOString().split('T')[0])
        }),
        async (testData) => {
          try {
            const locationBreakdown = await LocationBifurcationService.getLocationStockBreakdown(testData);

            // Property: All locations should include packaging details
            for (const location of locationBreakdown.locationBreakdown) {
              // Packaging name should be present and non-empty
              expect(location.packagingName).toBeDefined();
              expect(location.packagingName).not.toBe('');
              expect(typeof location.packagingName).toBe('string');

              // Bag size should be present and positive
              expect(location.bagSizeKg).toBeDefined();
              expect(location.bagSizeKg).toBeGreaterThan(0);
              expect(typeof location.bagSizeKg).toBe('number');

              // Grouping key should follow expected format
              expect(location.groupingKey).toMatch(/^.+\|.+\|.+\|.+\|.+kg$/);
              
              // Grouping key should contain location, variety, product type, packaging, and bag size
              const keyParts = location.groupingKey.split('|');
              expect(keyParts).toHaveLength(5);
              expect(keyParts[0]).toBe(location.locationCode);
              expect(keyParts[2]).toBe(location.productType);
              expect(keyParts[3]).toBe(location.packagingName);
              expect(keyParts[4]).toBe(`${location.bagSizeKg}kg`);
            }

          } catch (error) {
            if (error.message && error.message.includes('No stock found')) {
              return true;
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
});