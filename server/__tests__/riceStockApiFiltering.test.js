/**
 * Property Test: Rice Stock API Filtering Functionality
 * 
 * Validates that rice stock API endpoints properly filter data
 * and maintain consistency with standardized variety format.
 * 
 * Property 10: API Filtering Functionality
 * Validates: Requirements 6.5
 */

const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const { generateTestToken } = require('./helpers/testHelpers');
const fc = require('fast-check');

describe('Property Test: Rice Stock API Filtering', () => {
  let authToken;

  beforeAll(async () => {
    authToken = generateTestToken();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * Property 10: API Filtering Functionality
   * Tests that rice stock API endpoints properly filter data
   */
  test('Property 10: Rice stock API filtering maintains data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          productType: fc.oneof(
            fc.constant('Rice'),
            fc.constant('Broken'),
            fc.constant('Bran'),
            fc.constant(null)
          ),
          processingType: fc.oneof(
            fc.constant('Raw'),
            fc.constant('Steam'),
            fc.constant(null)
          ),
          locationCode: fc.oneof(
            fc.constant('STORE_A'),
            fc.constant('STORE_B'),
            fc.constant(null)
          )
        }),
        
        async (filters) => {
          console.log(`🧪 Testing API filtering with:`, filters);

          // Test rice stock varieties endpoint filtering
          const varietiesResponse = await request(app)
            .get('/api/rice-stock/varieties')
            .set('Authorization', `Bearer ${authToken}`)
            .query(Object.fromEntries(
              Object.entries(filters).filter(([_, value]) => value !== null)
            ));

          expect(varietiesResponse.status).toBe(200);
          
          if (varietiesResponse.body.varieties) {
            validateVarietiesFiltering(varietiesResponse.body.varieties, filters);
          }

          // Test rice stock report endpoint filtering
          const reportResponse = await request(app)
            .get('/api/rice-stock')
            .set('Authorization', `Bearer ${authToken}`)
            .query({
              dateFrom: '2024-01-01',
              dateTo: '2024-01-31',
              ...Object.fromEntries(
                Object.entries(filters).filter(([_, value]) => value !== null)
              )
            });

          expect(reportResponse.status).toBe(200);
          
          if (reportResponse.body.riceStock) {
            validateReportFiltering(reportResponse.body.riceStock, filters);
          }

          console.log('✅ API filtering validation passed');
        }
      ),
      { 
        numRuns: 30,
        timeout: 20000
      }
    );
  });
});
  /**
   * Validate varieties endpoint filtering
   */
  function validateVarietiesFiltering(varieties, filters) {
    varieties.forEach(variety => {
      // Validate product type filtering
      if (filters.productType) {
        expect(variety.productTypes).toContain(filters.productType);
      }

      // Validate processing type filtering
      if (filters.processingType) {
        const varietyName = variety.standardizedVariety || variety.variety;
        const hasProcessingType = varietyName.toUpperCase().includes(filters.processingType.toUpperCase());
        expect(hasProcessingType).toBe(true);
      }

      // Validate standardized format
      expect(variety).toHaveProperty('id');
      expect(variety).toHaveProperty('standardizedVariety');
      expect(typeof variety.standardizedVariety).toBe('string');
      expect(variety.standardizedVariety.length).toBeGreaterThan(0);
    });
  }

  /**
   * Validate report endpoint filtering
   */
  function validateReportFiltering(riceStock, filters) {
    riceStock.forEach(dayData => {
      [...dayData.openingStock, ...dayData.productions, ...dayData.closingStock].forEach(item => {
        // Validate product type filtering
        if (filters.productType && item.product) {
          expect(item.product).toBe(filters.productType);
        }

        // Validate location filtering
        if (filters.locationCode && item.location) {
          expect(item.location).toBe(filters.locationCode);
        }

        // Validate processing type filtering
        if (filters.processingType && item.variety) {
          const hasProcessingType = item.variety.toUpperCase().includes(filters.processingType.toUpperCase());
          expect(hasProcessingType).toBe(true);
        }
      });
    });
  }

  /**
   * Test specific filtering scenarios
   */
  test('Rice stock varieties endpoint filters by processing type correctly', async () => {
    const response = await request(app)
      .get('/api/rice-stock/varieties')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ processingType: 'Raw' });

    expect(response.status).toBe(200);
    
    if (response.body.varieties && response.body.varieties.length > 0) {
      response.body.varieties.forEach(variety => {
        const varietyName = variety.standardizedVariety.toUpperCase();
        expect(varietyName).toMatch(/RAW|R\b/);
      });
    }
  });

  test('Rice stock varieties endpoint filters by product type correctly', async () => {
    const response = await request(app)
      .get('/api/rice-stock/varieties')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ productType: 'Rice' });

    expect(response.status).toBe(200);
    
    if (response.body.varieties && response.body.varieties.length > 0) {
      response.body.varieties.forEach(variety => {
        expect(variety.productTypes).toContain('Rice');
      });
    }
  });

  test('Rice stock report endpoint respects multiple filters simultaneously', async () => {
    const response = await request(app)
      .get('/api/rice-stock')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        dateFrom: '2024-01-01',
        dateTo: '2024-01-15',
        productType: 'Rice',
        locationCode: 'STORE_A'
      });

    expect(response.status).toBe(200);
    
    if (response.body.riceStock && response.body.riceStock.length > 0) {
      response.body.riceStock.forEach(dayData => {
        [...dayData.openingStock, ...dayData.productions, ...dayData.closingStock].forEach(item => {
          if (item.product) {
            expect(item.product).toBe('Rice');
          }
          if (item.location) {
            expect(item.location).toBe('STORE_A');
          }
        });
      });
    }
  });

  test('Rice stock API maintains consistent variety format across filtered results', async () => {
    const filters = [
      { productType: 'Rice' },
      { processingType: 'Raw' },
      { locationCode: 'STORE_A' },
      {}
    ];

    for (const filter of filters) {
      const response = await request(app)
        .get('/api/rice-stock/varieties')
        .set('Authorization', `Bearer ${authToken}`)
        .query(filter);

      expect(response.status).toBe(200);
      
      if (response.body.varieties) {
        response.body.varieties.forEach(variety => {
          expect(variety.standardizedVariety).toBe(variety.standardizedVariety.toUpperCase().trim());
          expect(variety).toHaveProperty('outturnId');
          expect(variety).toHaveProperty('varietySource');
        });
      }
    }
  });
});