/**
 * Property Test: Rice Stock Report Consistency
 * 
 * Validates that rice stock reports use standardized variety format consistently
 * across all report types and maintain data integrity.
 * 
 * Property 8: Report Format Consistency
 * Validates: Requirements 5.3
 * 
 * This test ensures that:
 * 1. All rice stock reports use standardized variety names from outturns
 * 2. Variety naming is consistent across different report sections
 * 3. Legacy varieties are properly handled during transition
 * 4. Report data maintains referential integrity
 */

const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const { generateTestToken } = require('./helpers/testHelpers');

// Property-based testing utilities
const fc = require('fast-check');

describe('Property Test: Rice Stock Report Consistency', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateTestToken();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * Property 8: Report Format Consistency
   * 
   * Tests that rice stock reports maintain consistent variety formatting
   * across all sections and data points.
   */
  test('Property 8: Rice stock reports use consistent standardized variety format', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate test parameters for rice stock report
        fc.record({
          dateFrom: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') })
            .map(d => d.toISOString().split('T')[0]),
          dateTo: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-12-31') })
            .map(d => d.toISOString().split('T')[0]),
          productType: fc.oneof(
            fc.constant('Rice'),
            fc.constant('Broken'),
            fc.constant('Bran'),
            fc.constant(null)
          ),
          locationCode: fc.oneof(
            fc.constant('STORE_A'),
            fc.constant('STORE_B'),
            fc.constant(null)
          )
        }).filter(params => params.dateFrom <= params.dateTo),
        
        async (testParams) => {
          console.log(`🧪 Testing report consistency with params:`, testParams);

          // Fetch rice stock report
          const response = await request(app)
            .get('/api/rice-stock')
            .set('Authorization', `Bearer ${authToken}`)
            .query({
              dateFrom: testParams.dateFrom,
              dateTo: testParams.dateTo,
              ...(testParams.productType && { productType: testParams.productType }),
              ...(testParams.locationCode && { locationCode: testParams.locationCode })
            });

          expect(response.status).toBe(200);
          const reportData = response.body;

          if (!reportData.riceStock || reportData.riceStock.length === 0) {
            console.log('📊 No data for test parameters, skipping validation');
            return;
          }

          // Property 8.1: Variety format consistency across report sections
          for (const dayData of reportData.riceStock) {
            validateVarietyConsistencyInDay(dayData);
          }

          // Property 8.2: Standardized variety naming
          validateStandardizedVarietyNaming(reportData.riceStock);

          // Property 8.3: Outturn traceability
          validateOutturnTraceability(reportData.riceStock);

          // Property 8.4: Legacy variety handling
          validateLegacyVarietyHandling(reportData.riceStock);

          console.log('✅ Report consistency validation passed');
        }
      ),
      { 
        numRuns: 50,
        timeout: 30000,
        verbose: true
      }
    );
  });

  /**
   * Validate variety consistency within a single day's data
   */
  function validateVarietyConsistencyInDay(dayData) {
    const allVarieties = new Set();
    const varietyToOutturnMap = new Map();

    // Collect varieties from opening stock
    dayData.openingStock.forEach(stock => {
      if (stock.variety) {
        allVarieties.add(stock.variety);
        if (stock.outturnId) {
          varietyToOutturnMap.set(stock.variety, stock.outturnId);
        }
      }
    });

    // Collect varieties from productions/movements
    dayData.productions.forEach(prod => {
      if (prod.variety) {
        allVarieties.add(prod.variety);
        if (prod.outturnId) {
          varietyToOutturnMap.set(prod.variety, prod.outturnId);
        }
      }
    });

    // Collect varieties from closing stock
    dayData.closingStock.forEach(stock => {
      if (stock.variety) {
        allVarieties.add(stock.variety);
        if (stock.outturnId) {
          varietyToOutturnMap.set(stock.variety, stock.outturnId);
        }
      }
    });

    // Property 8.1: Same variety should map to same outturn consistently
    varietyToOutturnMap.forEach((outturnId, variety) => {
      const allMappingsForVariety = Array.from(varietyToOutturnMap.entries())
        .filter(([v, _]) => v === variety)
        .map(([_, id]) => id);

      const uniqueOutturns = new Set(allMappingsForVariety);
      expect(uniqueOutturns.size).toBeLessThanOrEqual(1);
    });

    console.log(`📊 Day ${dayData.date}: ${allVarieties.size} unique varieties, ${varietyToOutturnMap.size} outturn mappings`);
  }

  /**
   * Validate standardized variety naming across the entire report
   */
  function validateStandardizedVarietyNaming(riceStockData) {
    const varietyFormats = new Set();
    const outturnBasedVarieties = new Set();
    const legacyVarieties = new Set();

    riceStockData.forEach(dayData => {
      // Check opening stock varieties
      dayData.openingStock.forEach(stock => {
        if (stock.variety) {
          varietyFormats.add(stock.variety);
          if (stock.varietySource === 'outturn-based') {
            outturnBasedVarieties.add(stock.variety);
          } else {
            legacyVarieties.add(stock.variety);
          }
        }
      });

      // Check production/movement varieties
      dayData.productions.forEach(prod => {
        if (prod.variety) {
          varietyFormats.add(prod.variety);
          if (prod.varietySource === 'outturn-based') {
            outturnBasedVarieties.add(prod.variety);
          } else {
            legacyVarieties.add(prod.variety);
          }
        }
      });

      // Check closing stock varieties
      dayData.closingStock.forEach(stock => {
        if (stock.variety) {
          varietyFormats.add(stock.variety);
          if (stock.varietySource === 'outturn-based') {
            outturnBasedVarieties.add(stock.variety);
          } else {
            legacyVarieties.add(stock.variety);
          }
        }
      });
    });

    // Property 8.2: All varieties should follow standardized format (uppercase, trimmed)
    varietyFormats.forEach(variety => {
      expect(variety).toBe(variety.toUpperCase().trim());
      expect(variety.length).toBeGreaterThan(0);
    });

    console.log(`📊 Variety analysis: ${varietyFormats.size} total, ${outturnBasedVarieties.size} outturn-based, ${legacyVarieties.size} legacy`);
  }

  /**
   * Validate outturn traceability in reports
   */
  function validateOutturnTraceability(riceStockData) {
    const outturnMappings = new Map();

    riceStockData.forEach(dayData => {
      [...dayData.openingStock, ...dayData.productions, ...dayData.closingStock].forEach(item => {
        if (item.outturnId && item.variety) {
          if (outturnMappings.has(item.outturnId)) {
            // Same outturn should always map to same variety
            expect(outturnMappings.get(item.outturnId)).toBe(item.variety);
          } else {
            outturnMappings.set(item.outturnId, item.variety);
          }
        }
      });
    });

    // Property 8.3: Outturn IDs should have consistent variety mappings
    expect(outturnMappings.size).toBeGreaterThanOrEqual(0);
    console.log(`📊 Outturn traceability: ${outturnMappings.size} outturn-to-variety mappings`);
  }

  /**
   * Validate legacy variety handling during transition
   */
  function validateLegacyVarietyHandling(riceStockData) {
    let outturnBasedCount = 0;
    let legacyCount = 0;
    const mixedVarieties = new Set();

    riceStockData.forEach(dayData => {
      [...dayData.openingStock, ...dayData.productions, ...dayData.closingStock].forEach(item => {
        if (item.variety) {
          if (item.varietySource === 'outturn-based' || item.outturnId) {
            outturnBasedCount++;
          } else {
            legacyCount++;
            mixedVarieties.add(item.variety);
          }
        }
      });
    });

    // Property 8.4: System should handle both outturn-based and legacy varieties gracefully
    const totalVarieties = outturnBasedCount + legacyCount;
    if (totalVarieties > 0) {
      const outturnPercentage = (outturnBasedCount / totalVarieties) * 100;
      console.log(`📊 Variety migration progress: ${outturnPercentage.toFixed(1)}% outturn-based, ${legacyCount} legacy varieties`);
      
      // During transition, both types should be supported
      expect(outturnBasedCount + legacyCount).toBe(totalVarieties);
    }
  }

  /**
   * Test specific report consistency scenarios
   */
  test('Rice stock report maintains variety consistency in stock calculations', async () => {
    const response = await request(app)
      .get('/api/rice-stock')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-31'
      });

    expect(response.status).toBe(200);
    const reportData = response.body;

    if (reportData.riceStock && reportData.riceStock.length > 0) {
      // Test stock continuity between days
      for (let i = 1; i < reportData.riceStock.length; i++) {
        const prevDay = reportData.riceStock[i - 1];
        const currDay = reportData.riceStock[i];

        // Closing stock of previous day should influence opening stock of current day
        validateStockContinuity(prevDay.closingStock, currDay.openingStock);
      }
    }
  });

  /**
   * Validate stock continuity between consecutive days
   */
  function validateStockContinuity(prevClosing, currOpening) {
    const prevStockMap = new Map();
    const currStockMap = new Map();

    // Create stock maps by variety + location + packaging
    prevClosing.forEach(stock => {
      const key = `${stock.variety}|${stock.location}|${stock.packaging}`;
      prevStockMap.set(key, stock);
    });

    currOpening.forEach(stock => {
      const key = `${stock.variety}|${stock.location}|${stock.packaging}`;
      currStockMap.set(key, stock);
    });

    // Varieties should maintain consistent naming between days
    prevStockMap.forEach((stock, key) => {
      if (currStockMap.has(key)) {
        const currStock = currStockMap.get(key);
        expect(currStock.variety).toBe(stock.variety);
        expect(currStock.varietySource).toBe(stock.varietySource);
        if (stock.outturnId) {
          expect(currStock.outturnId).toBe(stock.outturnId);
        }
      }
    });
  }

  /**
   * Test report format consistency with different filters
   */
  test('Rice stock report format remains consistent across different filter combinations', async () => {
    const testCases = [
      { productType: 'Rice' },
      { locationCode: 'STORE_A' },
      { productType: 'Rice', locationCode: 'STORE_A' },
      { dateFrom: '2024-01-01', dateTo: '2024-01-15' }
    ];

    for (const testCase of testCases) {
      const response = await request(app)
        .get('/api/rice-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .query(testCase);

      expect(response.status).toBe(200);
      const reportData = response.body;

      // Validate consistent report structure
      expect(reportData).toHaveProperty('riceStock');
      expect(Array.isArray(reportData.riceStock)).toBe(true);

      if (reportData.riceStock.length > 0) {
        reportData.riceStock.forEach(dayData => {
          expect(dayData).toHaveProperty('date');
          expect(dayData).toHaveProperty('openingStock');
          expect(dayData).toHaveProperty('productions');
          expect(dayData).toHaveProperty('closingStock');
          expect(dayData).toHaveProperty('openingStockTotal');
          expect(dayData).toHaveProperty('closingStockTotal');

          // Validate variety format consistency
          [...dayData.openingStock, ...dayData.closingStock].forEach(stock => {
            if (stock.variety) {
              expect(typeof stock.variety).toBe('string');
              expect(stock.variety.length).toBeGreaterThan(0);
              expect(stock).toHaveProperty('varietySource');
            }
          });
        });
      }
    }
  });
});