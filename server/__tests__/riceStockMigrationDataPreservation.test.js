const fc = require('fast-check');
const { sequelize } = require('../config/database');
const Outturn = require('../models/Outturn');
const User = require('../models/User');
const riceStockVarietyAnalysis = require('../services/riceStockVarietyAnalysis');

describe('Rice Stock Migration Data Preservation Properties', () => {
  let testUser;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
    
    // Create or find a test user
    testUser = await User.findOne({ where: { username: 'admin' } });
    if (!testUser) {
      testUser = await User.create({
        username: 'test_user_migration',
        password: 'test123',
        role: 'admin'
      });
    }
    console.log('Test user setup:', { id: testUser.id, username: testUser.username });
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await sequelize.query('DELETE FROM rice_stock_variety_migration_log WHERE notes LIKE \'%test%\'');
      await sequelize.query('DELETE FROM rice_stock_movements WHERE variety LIKE \'TEST_%\' OR outturn_id IN (SELECT id FROM outturns WHERE code LIKE \'TEST_%\')');
      await sequelize.query('DELETE FROM outturns WHERE code LIKE \'TEST_%\'');
    } catch (error) {
      console.log('Cleanup error (expected):', error.message);
    }
    
    await sequelize.close();
  });

  /**
   * Property 4: Migration Data Preservation
   * Feature: rice-variety-standardization, Property 4: Migration Data Preservation
   * 
   * During migration, all rice stock movement data must be preserved exactly,
   * only the variety field mapping changes while all other fields remain identical
   */
  describe('Property 4: Migration Data Preservation', () => {
    test('rice stock variety analysis preserves all movement data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            varieties: fc.array(
              fc.record({
                variety: fc.constantFrom('BASMATI RAW', 'SUM25 RNR STEAM', 'DEC25 JSR RAW', 'P SONA STEAM'),
                movementType: fc.constantFrom('purchase', 'sale', 'palti'),
                productType: fc.constantFrom('Rice', 'Bran', 'Broken'),
                bags: fc.integer({ min: 1, max: 1000 }),
                quantityQuintals: fc.float({ min: 0.1, max: 100.0, noNaN: true }),
                locationCode: fc.constantFrom('A1', 'B2', 'C3', 'D4'),
                rate: fc.float({ min: 1000, max: 5000, noNaN: true })
              }),
              { minLength: 1, maxLength: 5 }
            )
          }),
          async ({ varieties }) => {
            const createdMovements = [];
            const createdOutturns = [];

            try {
              // Create test outturns for some varieties
              const outturnVarieties = ['BASMATI RAW', 'SUM25 RNR STEAM'];
              for (const variety of outturnVarieties) {
                const [allottedVariety, type] = variety.split(' ');
                const outturn = await Outturn.create({
                  code: `TEST_MIGRATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  allottedVariety: allottedVariety,
                  type: type,
                  createdBy: testUser.id
                });
                createdOutturns.push(outturn);
              }

              // Create rice stock movements with test data
              for (let i = 0; i < varieties.length; i++) {
                const varietyData = varieties[i];
                const [movementResult] = await sequelize.query(`
                  INSERT INTO rice_stock_movements (
                    date, movement_type, product_type, variety, bags, quantity_quintals,
                    location_code, rate, status, created_by, created_at, updated_at
                  ) VALUES (
                    CURRENT_DATE - INTERVAL '${i} days', $1, $2, $3, $4, $5,
                    $6, $7, 'approved', $8, NOW(), NOW()
                  ) RETURNING id, date, movement_type, product_type, variety, bags, 
                             quantity_quintals, location_code, rate, status, created_by
                `, {
                  bind: [
                    varietyData.movementType,
                    varietyData.productType,
                    `TEST_${varietyData.variety}`,
                    varietyData.bags,
                    varietyData.quantityQuintals,
                    varietyData.locationCode,
                    varietyData.rate,
                    testUser.id
                  ]
                });

                createdMovements.push(movementResult[0]);
              }

              // Store original data for comparison
              const originalData = createdMovements.map(movement => ({
                id: movement.id,
                date: movement.date,
                movement_type: movement.movement_type,
                product_type: movement.product_type,
                variety: movement.variety,
                bags: movement.bags,
                quantity_quintals: parseFloat(movement.quantity_quintals),
                location_code: movement.location_code,
                rate: parseFloat(movement.rate),
                status: movement.status,
                created_by: movement.created_by
              }));

              // Run variety analysis
              const analysisResults = await riceStockVarietyAnalysis.analyzeRiceStockVarieties();

              // Verify analysis results structure
              expect(analysisResults).toHaveProperty('timestamp');
              expect(analysisResults).toHaveProperty('summary');
              expect(analysisResults).toHaveProperty('varieties');
              expect(analysisResults).toHaveProperty('availableOutturns');

              // Verify that analysis found our test varieties
              const testVarieties = analysisResults.varieties.filter(v => 
                v.originalVariety.startsWith('TEST_')
              );
              expect(testVarieties.length).toBeGreaterThan(0);

              // Verify that all original movement data is still intact after analysis
              const [currentMovements] = await sequelize.query(`
                SELECT id, date, movement_type, product_type, variety, bags, 
                       quantity_quintals, location_code, rate, status, created_by
                FROM rice_stock_movements 
                WHERE id = ANY($1)
                ORDER BY id
              `, {
                bind: [createdMovements.map(m => m.id)]
              });

              // Verify data preservation - all fields except outturn_id should be identical
              expect(currentMovements.length).toBe(originalData.length);
              
              for (let i = 0; i < originalData.length; i++) {
                const original = originalData[i];
                const current = currentMovements[i];

                // All original fields must be preserved exactly
                expect(current.id).toBe(original.id);
                expect(current.date).toEqual(original.date);
                expect(current.movement_type).toBe(original.movement_type);
                expect(current.product_type).toBe(original.product_type);
                expect(current.variety).toBe(original.variety);
                expect(current.bags).toBe(original.bags);
                expect(parseFloat(current.quantity_quintals)).toBeCloseTo(original.quantity_quintals, 2);
                expect(current.location_code).toBe(original.location_code);
                expect(parseFloat(current.rate)).toBeCloseTo(original.rate, 2);
                expect(current.status).toBe(original.status);
                expect(current.created_by).toBe(original.created_by);
              }

              // Verify analysis provides correct mapping suggestions
              for (const testVariety of testVarieties) {
                expect(testVariety).toHaveProperty('originalVariety');
                expect(testVariety).toHaveProperty('usageCount');
                expect(testVariety).toHaveProperty('potentialMatches');
                expect(testVariety).toHaveProperty('recommendedAction');
                expect(testVariety).toHaveProperty('confidence');
                
                // Usage count should match actual usage
                expect(testVariety.usageCount).toBeGreaterThan(0);
                
                // Should have valid recommended action
                expect(['auto_map', 'review_and_map', 'manual_review', 'create_new_outturn'])
                  .toContain(testVariety.recommendedAction);
                
                // Confidence should be between 0 and 1
                expect(testVariety.confidence).toBeGreaterThanOrEqual(0);
                expect(testVariety.confidence).toBeLessThanOrEqual(1);
              }

            } finally {
              // Cleanup
              for (const movement of createdMovements) {
                await sequelize.query('DELETE FROM rice_stock_movements WHERE id = $1', {
                  bind: [movement.id]
                });
              }
              for (const outturn of createdOutturns) {
                await outturn.destroy();
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('variety analysis correctly identifies exact and fuzzy matches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            baseVariety: fc.constantFrom('BASMATI', 'SUM25 RNR', 'DEC25 JSR'),
            type: fc.constantFrom('RAW', 'STEAM'),
            variations: fc.array(
              fc.constantFrom('', ' ', '_', '-'),
              { minLength: 0, maxLength: 2 }
            )
          }),
          async ({ baseVariety, type, variations }) => {
            let createdOutturn = null;
            let createdMovement = null;

            try {
              // Create outturn with standard format
              createdOutturn = await Outturn.create({
                code: `TEST_MATCH_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                allottedVariety: baseVariety,
                type: type,
                createdBy: testUser.id
              });

              const standardVariety = `${baseVariety} ${type}`;
              
              // Create movement with variation of the variety
              const variationString = variations.join('');
              const testVariety = `TEST_MATCH_${standardVariety.replace(/\s+/g, variationString)}`;
              
              const [movementResult] = await sequelize.query(`
                INSERT INTO rice_stock_movements (
                  date, movement_type, product_type, variety, bags, quantity_quintals,
                  location_code, status, created_by, created_at, updated_at
                ) VALUES (
                  CURRENT_DATE, 'purchase', 'Rice', $1, 10, 5.0,
                  'A1', 'approved', $2, NOW(), NOW()
                ) RETURNING id
              `, {
                bind: [testVariety, testUser.id]
              });

              createdMovement = movementResult[0];

              // Run analysis
              const analysisResults = await riceStockVarietyAnalysis.analyzeRiceStockVarieties();

              // Find our test variety in results
              const testVarietyResult = analysisResults.varieties.find(v => 
                v.originalVariety === testVariety
              );

              if (testVarietyResult) {
                // Should have found potential matches
                expect(testVarietyResult.potentialMatches).toBeDefined();
                
                // If variety is very similar, should have high confidence match
                if (variationString.length <= 1) {
                  expect(testVarietyResult.potentialMatches.length).toBeGreaterThan(0);
                  
                  // Check if our created outturn is in the matches
                  const matchingOutturn = testVarietyResult.potentialMatches.find(m => 
                    m.outturnId === createdOutturn.id
                  );
                  
                  if (matchingOutturn) {
                    expect(matchingOutturn.confidence).toBeGreaterThan(0.5);
                    expect(['exact', 'variety_partial', 'abbreviation']).toContain(matchingOutturn.matchType);
                  }
                }

                // Verify analysis metadata
                expect(testVarietyResult.usageCount).toBe(1);
                expect(testVarietyResult.movementTypes).toContain('purchase');
                expect(testVarietyResult.productTypes).toContain('Rice');
              }

            } finally {
              // Cleanup
              if (createdMovement) {
                await sequelize.query('DELETE FROM rice_stock_movements WHERE id = $1', {
                  bind: [createdMovement.id]
                });
              }
              if (createdOutturn) {
                await createdOutturn.destroy();
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    test('analysis summary statistics are accurate', async () => {
      // Create a controlled test scenario
      const testOutturns = [];
      const testMovements = [];

      try {
        // Create 2 test outturns
        for (let i = 0; i < 2; i++) {
          const outturn = await Outturn.create({
            code: `TEST_SUMMARY_${Date.now()}_${i}`,
            allottedVariety: i === 0 ? 'BASMATI' : 'SUM25 RNR',
            type: 'RAW',
            createdBy: testUser.id
          });
          testOutturns.push(outturn);
        }

        // Create movements: 1 exact match, 1 fuzzy match, 1 no match
        const movementData = [
          { variety: 'TEST_SUMMARY_BASMATI RAW', expectedMatch: 'exact' },
          { variety: 'TEST_SUMMARY_BASMATI', expectedMatch: 'fuzzy' },
          { variety: 'TEST_SUMMARY_UNKNOWN_VARIETY', expectedMatch: 'none' }
        ];

        for (const data of movementData) {
          const [movementResult] = await sequelize.query(`
            INSERT INTO rice_stock_movements (
              date, movement_type, product_type, variety, bags, quantity_quintals,
              location_code, status, created_by, created_at, updated_at
            ) VALUES (
              CURRENT_DATE, 'purchase', 'Rice', $1, 10, 5.0,
              'A1', 'approved', $2, NOW(), NOW()
            ) RETURNING id
          `, {
            bind: [data.variety, testUser.id]
          });
          testMovements.push(movementResult[0]);
        }

        // Run analysis
        const analysisResults = await riceStockVarietyAnalysis.analyzeRiceStockVarieties();

        // Verify summary statistics
        const summary = analysisResults.summary;
        expect(summary).toHaveProperty('totalVarieties');
        expect(summary).toHaveProperty('exactMatches');
        expect(summary).toHaveProperty('fuzzyMatches');
        expect(summary).toHaveProperty('noMatches');
        expect(summary).toHaveProperty('totalUsageCount');

        // Find our test varieties in results
        const testVarieties = analysisResults.varieties.filter(v => 
          v.originalVariety.startsWith('TEST_SUMMARY_')
        );

        expect(testVarieties.length).toBe(3);

        // Verify individual variety analysis
        const exactMatchVariety = testVarieties.find(v => 
          v.originalVariety === 'TEST_SUMMARY_BASMATI RAW'
        );
        const fuzzyMatchVariety = testVarieties.find(v => 
          v.originalVariety === 'TEST_SUMMARY_BASMATI'
        );
        const noMatchVariety = testVarieties.find(v => 
          v.originalVariety === 'TEST_SUMMARY_UNKNOWN_VARIETY'
        );

        // Exact match should have high confidence
        if (exactMatchVariety && exactMatchVariety.potentialMatches.length > 0) {
          expect(exactMatchVariety.potentialMatches[0].matchType).toBe('exact');
          expect(exactMatchVariety.confidence).toBe(1.0);
        }

        // Fuzzy match should have medium confidence
        if (fuzzyMatchVariety && fuzzyMatchVariety.potentialMatches.length > 0) {
          expect(fuzzyMatchVariety.confidence).toBeGreaterThan(0.5);
          expect(fuzzyMatchVariety.confidence).toBeLessThan(1.0);
        }

        // No match should have zero confidence
        if (noMatchVariety) {
          expect(noMatchVariety.confidence).toBe(0);
          expect(noMatchVariety.recommendedAction).toBe('create_new_outturn');
        }

      } finally {
        // Cleanup
        for (const movement of testMovements) {
          await sequelize.query('DELETE FROM rice_stock_movements WHERE id = $1', {
            bind: [movement.id]
          });
        }
        for (const outturn of testOutturns) {
          await outturn.destroy();
        }
      }
    });
  });
});