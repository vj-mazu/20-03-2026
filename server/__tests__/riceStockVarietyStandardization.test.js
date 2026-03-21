const fc = require('fast-check');
const { sequelize } = require('../config/database');
const Outturn = require('../models/Outturn');
const User = require('../models/User');

describe('Rice Stock Variety Standardization Properties', () => {
  let testUser;

  beforeAll(async () => {
    // Create a test user for outturn creation
    testUser = await User.findOne({ where: { username: 'admin' } });
    if (!testUser) {
      testUser = await User.create({
        username: 'test_user_rice_stock',
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
      await sequelize.query('DELETE FROM rice_stock_movements WHERE outturn_id IN (SELECT id FROM outturns WHERE code LIKE \'TEST_%\')');
      await sequelize.query('DELETE FROM outturns WHERE code LIKE \'TEST_%\'');
    } catch (error) {
      console.log('Cleanup error (expected):', error.message);
    }
  });

  /**
   * Property 2: Referential Integrity Enforcement
   * Feature: rice-variety-standardization, Property 2: Referential Integrity Enforcement
   * 
   * For any rice stock movement, it must reference a valid outturn ID, and deletion 
   * of outturns with associated movements must be prevented
   */
  describe('Property 2: Referential Integrity Enforcement', () => {
    test('rice stock movements must reference valid outturns and prevent outturn deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test data for outturns and rice stock movements
          fc.record({
            outturnCode: fc.string({ minLength: 5, maxLength: 10 }).map(s => `TEST_${s}`),
            allottedVariety: fc.constantFrom('Sum25 RNR', 'Basmati', 'DEC25 JSR', 'SUM25 P SONA'),
            type: fc.constantFrom('Raw', 'Steam'),
            movementType: fc.constantFrom('purchase', 'sale', 'palti'),
            productType: fc.constantFrom('Rice', 'Bran', 'Broken'),
            bags: fc.integer({ min: 1, max: 1000 }),
            quantityQuintals: fc.float({ min: 0.1, max: 100.0, noNaN: true }),
            locationCode: fc.constantFrom('A1', 'B2', 'C3', 'D4')
          }),
          async ({ outturnCode, allottedVariety, type, movementType, productType, bags, quantityQuintals, locationCode }) => {
            let createdOutturn = null;
            let createdMovement = null;

            try {
              // 1. Create a test outturn
              createdOutturn = await Outturn.create({
                code: outturnCode,
                allottedVariety: allottedVariety,
                type: type,
                createdBy: testUser.id
              });

              // 2. Verify outturn was created successfully
              expect(createdOutturn).toBeTruthy();
              expect(createdOutturn.id).toBeTruthy();

              // 3. Create rice stock movement with valid outturn reference
              const [movementResult] = await sequelize.query(`
                INSERT INTO rice_stock_movements (
                  date, movement_type, product_type, variety, bags, quantity_quintals,
                  location_code, outturn_id, status, created_by, created_at, updated_at
                ) VALUES (
                  CURRENT_DATE, :movementType, :productType, :variety, :bags, :quantityQuintals,
                  :locationCode, :outturnId, 'approved', :createdBy, NOW(), NOW()
                ) RETURNING id
              `, {
                replacements: {
                  movementType,
                  productType,
                  variety: `${allottedVariety} ${type}`.toUpperCase(),
                  bags,
                  quantityQuintals,
                  locationCode,
                  outturnId: createdOutturn.id,
                  createdBy: testUser.id
                }
              });

              createdMovement = movementResult[0];

              // 4. Verify rice stock movement was created with valid outturn reference
              expect(createdMovement).toBeTruthy();
              expect(createdMovement.id).toBeTruthy();

              // 5. Verify referential integrity: cannot delete outturn with associated movements
              let deletionPrevented = false;
              try {
                await createdOutturn.destroy();
              } catch (error) {
                deletionPrevented = true;
                expect(error.message).toContain('Cannot delete outturn');
              }

              // 6. Assert that outturn deletion was prevented
              expect(deletionPrevented).toBe(true);

              // 7. Verify outturn still exists
              const stillExists = await Outturn.findByPk(createdOutturn.id);
              expect(stillExists).toBeTruthy();

              // 8. Verify rice stock movement still references valid outturn
              const [movementCheck] = await sequelize.query(`
                SELECT rsm.id, rsm.outturn_id, o.id as outturn_exists
                FROM rice_stock_movements rsm
                LEFT JOIN outturns o ON rsm.outturn_id = o.id
                WHERE rsm.id = :movementId
              `, {
                replacements: { movementId: createdMovement.id }
              });

              expect(movementCheck.length).toBe(1);
              expect(movementCheck[0].outturn_id).toBe(createdOutturn.id);
              expect(movementCheck[0].outturn_exists).toBe(createdOutturn.id);

            } finally {
              // Cleanup: Delete movement first, then outturn
              try {
                if (createdMovement) {
                  await sequelize.query('DELETE FROM rice_stock_movements WHERE id = :id', {
                    replacements: { id: createdMovement.id }
                  });
                }
                if (createdOutturn) {
                  await createdOutturn.destroy();
                }
              } catch (error) {
                console.log('Cleanup error (expected):', error.message);
              }
            }
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in requirements
      );
    });

    test('rice stock movements cannot reference non-existent outturns', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            nonExistentOutturnId: fc.integer({ min: 999999, max: 9999999 }), // Very high ID unlikely to exist
            movementType: fc.constantFrom('purchase', 'sale', 'palti'),
            productType: fc.constantFrom('Rice', 'Bran', 'Broken'),
            bags: fc.integer({ min: 1, max: 100 }),
            quantityQuintals: fc.float({ min: 0.1, max: 10.0, noNaN: true }),
            locationCode: fc.constantFrom('A1', 'B2', 'C3')
          }),
          async ({ nonExistentOutturnId, movementType, productType, bags, quantityQuintals, locationCode }) => {
            // Verify the outturn ID doesn't exist
            const outturnExists = await Outturn.findByPk(nonExistentOutturnId);
            expect(outturnExists).toBeNull();

            // Attempt to create rice stock movement with non-existent outturn reference
            let foreignKeyViolation = false;
            try {
              await sequelize.query(`
                INSERT INTO rice_stock_movements (
                  date, movement_type, product_type, variety, bags, quantity_quintals,
                  location_code, outturn_id, status, created_by, created_at, updated_at
                ) VALUES (
                  CURRENT_DATE, :movementType, :productType, 'TEST VARIETY', :bags, :quantityQuintals,
                  :locationCode, :outturnId, 'approved', :createdBy, NOW(), NOW()
                )
              `, {
                replacements: {
                  movementType,
                  productType,
                  bags,
                  quantityQuintals,
                  locationCode,
                  outturnId: nonExistentOutturnId,
                  createdBy: testUser.id
                }
              });
            } catch (error) {
              foreignKeyViolation = true;
              expect(error.message).toMatch(/foreign key constraint|violates foreign key/i);
            }

            // Assert that foreign key constraint prevented the insertion
            expect(foreignKeyViolation).toBe(true);
          }
        ),
        { numRuns: 50 } // Fewer runs since this tests constraint violations
      );
    });

    test('helper functions work correctly for variety standardization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            outturnCode: fc.string({ minLength: 5, maxLength: 10 }).map(s => `TEST_HELPER_${s}`),
            allottedVariety: fc.constantFrom('Sum25 RNR', 'Basmati', 'DEC25 JSR'),
            type: fc.constantFrom('Raw', 'Steam')
          }),
          async ({ outturnCode, allottedVariety, type }) => {
            let createdOutturn = null;

            try {
              // Create test outturn
              createdOutturn = await Outturn.create({
                code: outturnCode,
                allottedVariety: allottedVariety,
                type: type,
                createdBy: testUser.id
              });

              // Test get_standardized_variety_from_outturn function
              const [varietyResult] = await sequelize.query(`
                SELECT get_standardized_variety_from_outturn(:outturnId) as standardized_variety
              `, {
                replacements: { outturnId: createdOutturn.id }
              });

              const expectedVariety = `${allottedVariety} ${type}`.toUpperCase();
              expect(varietyResult[0].standardized_variety).toBe(expectedVariety);

              // Test find_outturn_by_variety_string function
              const [findResult] = await sequelize.query(`
                SELECT find_outturn_by_variety_string(:varietyString) as found_outturn_id
              `, {
                replacements: { varietyString: expectedVariety }
              });

              expect(findResult[0].found_outturn_id).toBe(createdOutturn.id);

            } finally {
              // Cleanup
              if (createdOutturn) {
                await createdOutturn.destroy();
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});