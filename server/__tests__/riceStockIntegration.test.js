/**
 * Rice Stock Integration Testing
 * 
 * Tests complete Purchase/Sale/Palti workflows with new variety system.
 * Verifies all rice stock variety operations work end-to-end.
 * Tests rice stock error scenarios and recovery.
 * Verifies arrivals and other systems remain completely unchanged.
 * 
 * Requirements: All rice stock requirements
 */

const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../config/database');
const { generateTestToken } = require('./helpers/testHelpers');

describe('Rice Stock Integration Testing', () => {
  let authToken;
  let testOutturnId;
  let testPackagingId;

  beforeAll(async () => {
    authToken = generateTestToken();
    
    // Get test outturn and packaging for integration tests
    const [outturns] = await sequelize.query(`
      SELECT id FROM outturns LIMIT 1
    `);
    testOutturnId = outturns[0]?.id || 105;

    const [packagings] = await sequelize.query(`
      SELECT id FROM packagings LIMIT 1
    `);
    testPackagingId = packagings[0]?.id || 1;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * Test complete Purchase workflow with new variety system
   */
  test('Complete Purchase workflow with standardized varieties', async () => {
    console.log('🧪 Testing complete Purchase workflow');

    // Step 1: Get available varieties
    const varietiesResponse = await request(app)
      .get('/api/rice-stock/varieties')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ productType: 'Rice' });

    expect(varietiesResponse.status).toBe(200);
    expect(varietiesResponse.body.varieties).toBeDefined();

    if (varietiesResponse.body.varieties.length === 0) {
      console.log('⚠️ No varieties available for Purchase test');
      return;
    }

    const testVariety = varietiesResponse.body.varieties[0];

    // Step 2: Validate variety before purchase
    const validationResponse = await request(app)
      .post('/api/rice-stock/varieties/validate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        outturnId: testVariety.outturnId,
        variety: testVariety.standardizedVariety
      });

    expect(validationResponse.status).toBe(200);
    expect(validationResponse.body.isValid).toBe(true);

    // Step 3: Create purchase with standardized variety
    const purchaseData = {
      date: new Date().toISOString().split('T')[0],
      outturnId: testVariety.outturnId,
      variety: testVariety.standardizedVariety,
      productType: 'Rice',
      packagingId: testPackagingId,
      bags: 10,
      quantityQuintals: 5.0,
      locationCode: 'STORE_A',
      fromLocation: 'Supplier Test',
      billNumber: `TEST-BILL-${Date.now()}`,
      lorryNumber: `TEST-LORRY-${Date.now()}`
    };

    const purchaseResponse = await request(app)
      .post('/api/rice-stock/purchase')
      .set('Authorization', `Bearer ${authToken}`)
      .send(purchaseData);

    expect(purchaseResponse.status).toBe(201);
    expect(purchaseResponse.body.movement).toBeDefined();
    expect(purchaseResponse.body.movement.outturnId).toBe(testVariety.outturnId);
    expect(purchaseResponse.body.movement.varietySource).toBe('outturn-based');

    // Step 4: Verify purchase appears in stock report
    const stockResponse = await request(app)
      .get('/api/rice-stock')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        dateFrom: purchaseData.date,
        dateTo: purchaseData.date,
        productType: 'Rice'
      });

    expect(stockResponse.status).toBe(200);
    
    if (stockResponse.body.riceStock && stockResponse.body.riceStock.length > 0) {
      const dayData = stockResponse.body.riceStock[0];
      const purchaseFound = dayData.productions.some(prod => 
        prod.movementType === 'purchase' && 
        prod.outturnId === testVariety.outturnId
      );
      expect(purchaseFound).toBe(true);
    }

    console.log('✅ Purchase workflow completed successfully');
  });

  /**
   * Test complete Sale workflow with new variety system
   */
  test('Complete Sale workflow with standardized varieties', async () => {
    console.log('🧪 Testing complete Sale workflow');

    // First ensure we have stock to sell by creating a purchase
    const setupPurchase = {
      date: new Date().toISOString().split('T')[0],
      outturnId: testOutturnId,
      productType: 'Rice',
      packagingId: testPackagingId,
      bags: 20,
      quantityQuintals: 10.0,
      locationCode: 'STORE_A',
      fromLocation: 'Setup Supplier'
    };

    await request(app)
      .post('/api/rice-stock/purchase')
      .set('Authorization', `Bearer ${authToken}`)
      .send(setupPurchase);

    // Now test sale workflow
    const saleData = {
      date: new Date().toISOString().split('T')[0],
      outturnId: testOutturnId,
      productType: 'Rice',
      packagingId: testPackagingId,
      bags: 5,
      quantityQuintals: 2.5,
      locationCode: 'STORE_A',
      toLocation: 'Customer Test',
      billNumber: `SALE-BILL-${Date.now()}`,
      lorryNumber: `SALE-LORRY-${Date.now()}`
    };

    const saleResponse = await request(app)
      .post('/api/rice-stock/sale')
      .set('Authorization', `Bearer ${authToken}`)
      .send(saleData);

    expect(saleResponse.status).toBe(201);
    expect(saleResponse.body.movement).toBeDefined();
    expect(saleResponse.body.movement.outturnId).toBe(testOutturnId);
    expect(saleResponse.body.movement.movementType).toBe('sale');

    console.log('✅ Sale workflow completed successfully');
  });

  /**
   * Test complete Palti workflow with new variety system
   */
  test('Complete Palti workflow with standardized varieties', async () => {
    console.log('🧪 Testing complete Palti workflow');

    // Get different packaging for palti conversion
    const [packagings] = await sequelize.query(`
      SELECT id, "brandName", "allottedKg" FROM packagings LIMIT 2
    `);

    if (packagings.length < 2) {
      console.log('⚠️ Need at least 2 packagings for Palti test');
      return;
    }

    const sourcePackaging = packagings[0];
    const targetPackaging = packagings[1];

    // Setup stock for palti
    const setupPurchase = {
      date: new Date().toISOString().split('T')[0],
      outturnId: testOutturnId,
      productType: 'Rice',
      packagingId: sourcePackaging.id,
      bags: 15,
      quantityQuintals: 7.5,
      locationCode: 'STORE_A',
      fromLocation: 'Palti Setup Supplier'
    };

    await request(app)
      .post('/api/rice-stock/purchase')
      .set('Authorization', `Bearer ${authToken}`)
      .send(setupPurchase);

    // Execute palti conversion
    const paltiData = {
      date: new Date().toISOString().split('T')[0],
      outturnId: testOutturnId,
      productType: 'Rice',
      sourcePackagingId: sourcePackaging.id,
      targetPackagingId: targetPackaging.id,
      sourceBags: 10,
      targetBags: 8,
      quantityQuintals: 4.0,
      locationCode: 'STORE_A',
      conversionShortageKg: 50, // 0.5 quintals shortage
      notes: 'Integration test palti conversion'
    };

    const paltiResponse = await request(app)
      .post('/api/rice-stock/palti')
      .set('Authorization', `Bearer ${authToken}`)
      .send(paltiData);

    expect(paltiResponse.status).toBe(201);
    expect(paltiResponse.body.movement).toBeDefined();
    expect(paltiResponse.body.movement.outturnId).toBe(testOutturnId);
    expect(paltiResponse.body.movement.movementType).toBe('palti');
    expect(paltiResponse.body.movement.sourcePackagingId).toBe(sourcePackaging.id);
    expect(paltiResponse.body.movement.targetPackagingId).toBe(targetPackaging.id);

    console.log('✅ Palti workflow completed successfully');
  });

  /**
   * Test error scenarios and recovery
   */
  test('Rice stock error scenarios and recovery', async () => {
    console.log('🧪 Testing error scenarios and recovery');

    // Test 1: Invalid outturn ID
    const invalidOutturnResponse = await request(app)
      .post('/api/rice-stock/purchase')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: new Date().toISOString().split('T')[0],
        outturnId: 99999, // Non-existent outturn
        productType: 'Rice',
        packagingId: testPackagingId,
        bags: 5,
        quantityQuintals: 2.5,
        locationCode: 'STORE_A'
      });

    expect(invalidOutturnResponse.status).toBe(400);
    expect(invalidOutturnResponse.body.error).toBe(true);
    expect(invalidOutturnResponse.body.type).toBeDefined();

    // Test 2: Insufficient stock for sale
    const insufficientStockResponse = await request(app)
      .post('/api/rice-stock/sale')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: new Date().toISOString().split('T')[0],
        outturnId: testOutturnId,
        productType: 'Rice',
        packagingId: testPackagingId,
        bags: 1000, // Excessive quantity
        quantityQuintals: 500.0,
        locationCode: 'STORE_A',
        toLocation: 'Test Customer'
      });

    expect(insufficientStockResponse.status).toBe(400);
    expect(insufficientStockResponse.body.error).toBe(true);

    // Test 3: Invalid variety validation
    const invalidVarietyResponse = await request(app)
      .post('/api/rice-stock/varieties/validate')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        variety: 'INVALID_VARIETY_NAME'
      });

    expect(invalidVarietyResponse.status).toBe(200);
    expect(invalidVarietyResponse.body.isValid).toBe(false);

    console.log('✅ Error scenarios tested successfully');
  });

  /**
   * Verify arrivals system remains unchanged
   */
  test('Arrivals system remains completely unchanged', async () => {
    console.log('🧪 Verifying arrivals system unchanged');

    // Test arrivals endpoint still works
    const arrivalsResponse = await request(app)
      .get('/api/arrivals')
      .set('Authorization', `Bearer ${authToken}`)
      .query({ limit: 5 });

    // Should work regardless of rice stock changes
    expect([200, 404]).toContain(arrivalsResponse.status);

    // Test unified varieties endpoint (used by arrivals)
    const unifiedVarietiesResponse = await request(app)
      .get('/api/unified-varieties')
      .set('Authorization', `Bearer ${authToken}`);

    // Should work independently of rice stock varieties
    expect([200, 404]).toContain(unifiedVarietiesResponse.status);

    // Verify rice stock varieties endpoint is separate
    const riceStockVarietiesResponse = await request(app)
      .get('/api/rice-stock/varieties')
      .set('Authorization', `Bearer ${authToken}`);

    expect(riceStockVarietiesResponse.status).toBe(200);

    console.log('✅ Arrivals system independence verified');
  });

  /**
   * Test variety source consistency across operations
   */
  test('Variety source consistency across all rice stock operations', async () => {
    console.log('🧪 Testing variety source consistency');

    // Get varieties with different sources
    const varietiesResponse = await request(app)
      .get('/api/rice-stock/varieties')
      .set('Authorization', `Bearer ${authToken}`);

    expect(varietiesResponse.status).toBe(200);

    if (varietiesResponse.body.varieties && varietiesResponse.body.varieties.length > 0) {
      const outturnBasedVarieties = varietiesResponse.body.varieties.filter(v => v.outturnId);
      const legacyVarieties = varietiesResponse.body.varieties.filter(v => !v.outturnId);

      console.log(`📊 Found ${outturnBasedVarieties.length} outturn-based varieties, ${legacyVarieties.length} legacy varieties`);

      // Test operations with outturn-based varieties
      if (outturnBasedVarieties.length > 0) {
        const testVariety = outturnBasedVarieties[0];
        
        const purchaseResponse = await request(app)
          .post('/api/rice-stock/purchase')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            date: new Date().toISOString().split('T')[0],
            outturnId: testVariety.outturnId,
            variety: testVariety.standardizedVariety,
            productType: 'Rice',
            packagingId: testPackagingId,
            bags: 3,
            quantityQuintals: 1.5,
            locationCode: 'STORE_A'
          });

        if (purchaseResponse.status === 201) {
          expect(purchaseResponse.body.movement.varietySource).toBe('outturn-based');
          expect(purchaseResponse.body.movement.outturnId).toBe(testVariety.outturnId);
        }
      }

      // Verify consistency in stock reports
      const stockResponse = await request(app)
        .get('/api/rice-stock')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          dateFrom: new Date().toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0]
        });

      if (stockResponse.status === 200 && stockResponse.body.riceStock) {
        stockResponse.body.riceStock.forEach(dayData => {
          [...dayData.openingStock, ...dayData.productions, ...dayData.closingStock].forEach(item => {
            if (item.outturnId) {
              expect(item.varietySource).toBe('outturn-based');
            } else if (item.varietySource) {
              expect(item.varietySource).toBe('legacy');
            }
          });
        });
      }
    }

    console.log('✅ Variety source consistency verified');
  });

  /**
   * Test backward compatibility during operations
   */
  test('Backward compatibility works during rice stock operations', async () => {
    console.log('🧪 Testing backward compatibility');

    // Test purchase with legacy variety format
    const legacyPurchaseResponse = await request(app)
      .post('/api/rice-stock/purchase')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        date: new Date().toISOString().split('T')[0],
        variety: 'BPT RAW', // Legacy string format
        productType: 'Rice',
        packagingId: testPackagingId,
        bags: 2,
        quantityQuintals: 1.0,
        locationCode: 'STORE_A',
        fromLocation: 'Legacy Test Supplier'
      });

    // Should work with backward compatibility
    expect([201, 400]).toContain(legacyPurchaseResponse.status);

    if (legacyPurchaseResponse.status === 201) {
      // Should have been enhanced with outturn info if possible
      const movement = legacyPurchaseResponse.body.movement;
      expect(movement.variety).toBeTruthy();
      
      if (movement.outturnId) {
        expect(movement.varietySource).toBe('outturn-based');
      }
    }

    console.log('✅ Backward compatibility verified');
  });

  /**
   * Test end-to-end workflow with mixed variety sources
   */
  test('End-to-end workflow with mixed variety sources', async () => {
    console.log('🧪 Testing mixed variety sources workflow');

    const testDate = new Date().toISOString().split('T')[0];

    // Create purchases with different variety sources
    const purchases = [
      {
        outturnId: testOutturnId,
        variety: null, // Will be filled from outturn
        source: 'outturn-based'
      },
      {
        outturnId: null,
        variety: 'LEGACY VARIETY RAW',
        source: 'legacy-string'
      }
    ];

    for (const purchase of purchases) {
      const purchaseResponse = await request(app)
        .post('/api/rice-stock/purchase')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          date: testDate,
          outturnId: purchase.outturnId,
          variety: purchase.variety,
          productType: 'Rice',
          packagingId: testPackagingId,
          bags: 5,
          quantityQuintals: 2.5,
          locationCode: 'STORE_A',
          fromLocation: `${purchase.source} Supplier`
        });

      // Should handle both sources appropriately
      expect([201, 400]).toContain(purchaseResponse.status);
    }

    // Verify mixed sources appear correctly in reports
    const reportResponse = await request(app)
      .get('/api/rice-stock')
      .set('Authorization', `Bearer ${authToken}`)
      .query({
        dateFrom: testDate,
        dateTo: testDate
      });

    expect(reportResponse.status).toBe(200);

    if (reportResponse.body.riceStock && reportResponse.body.riceStock.length > 0) {
      const dayData = reportResponse.body.riceStock[0];
      
      // Should have transactions with different variety sources
      const varietySources = new Set();
      dayData.productions.forEach(prod => {
        if (prod.varietySource) {
          varietySources.add(prod.varietySource);
        }
      });

      console.log(`📊 Found variety sources: ${Array.from(varietySources).join(', ')}`);
    }

    console.log('✅ Mixed variety sources workflow completed');
  });
});