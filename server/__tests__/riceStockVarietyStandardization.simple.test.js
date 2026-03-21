const { sequelize } = require('../config/database');
const Outturn = require('../models/Outturn');
const User = require('../models/User');

describe('Rice Stock Variety Standardization - Simple Tests', () => {
  let testUser;

  beforeAll(async () => {
    // Ensure database connection
    await sequelize.authenticate();
    
    // Create or find a test user
    testUser = await User.findOne({ where: { username: 'admin' } });
    if (!testUser) {
      testUser = await User.create({
        username: 'test_user_rice_stock_simple',
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
    
    await sequelize.close();
  });

  test('database schema has outturn_id column in rice_stock_movements', async () => {
    const [result] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'rice_stock_movements' AND column_name = 'outturn_id'
    `);
    
    expect(result.length).toBe(1);
    expect(result[0].column_name).toBe('outturn_id');
    expect(result[0].data_type).toBe('integer');
  });

  test('helper functions exist and work correctly', async () => {
    // Create test outturn
    const testOutturn = await Outturn.create({
      code: `TEST_HELPER_${Date.now()}`,
      allottedVariety: 'Sum25 RNR',
      type: 'Raw',
      createdBy: testUser.id
    });

    try {
      // Test get_standardized_variety_from_outturn function
      const [varietyResult] = await sequelize.query(`
        SELECT get_standardized_variety_from_outturn($1) as standardized_variety
      `, {
        bind: [testOutturn.id]
      });

      expect(varietyResult[0].standardized_variety).toBe('SUM25 RNR RAW');

      // Test find_outturn_by_variety_string function
      const [findResult] = await sequelize.query(`
        SELECT find_outturn_by_variety_string($1) as found_outturn_id
      `, {
        bind: ['SUM25 RNR RAW']
      });

      expect(findResult[0].found_outturn_id).toBe(testOutturn.id);

    } finally {
      // Cleanup
      await testOutturn.destroy();
    }
  });

  test('can create rice stock movement with outturn reference', async () => {
    // Create test outturn
    const testOutturn = await Outturn.create({
      code: `TEST_MOVEMENT_${Date.now()}`,
      allottedVariety: 'Basmati',
      type: 'Steam',
      createdBy: testUser.id
    });

    try {
      // Create rice stock movement with outturn reference
      const [movementResult] = await sequelize.query(`
        INSERT INTO rice_stock_movements (
          date, movement_type, product_type, variety, bags, quantity_quintals,
          location_code, outturn_id, status, created_by, created_at, updated_at
        ) VALUES (
          CURRENT_DATE, 'purchase', 'Rice', 'BASMATI STEAM', 100, 50.0,
          'A1', $1, 'approved', $2, NOW(), NOW()
        ) RETURNING id, outturn_id
      `, {
        bind: [testOutturn.id, testUser.id]
      });

      expect(movementResult[0].id).toBeTruthy();
      expect(movementResult[0].outturn_id).toBe(testOutturn.id);

      // Verify referential integrity - cannot delete outturn with associated movements
      let deletionPrevented = false;
      try {
        await testOutturn.destroy();
      } catch (error) {
        deletionPrevented = true;
        expect(error.message).toContain('Cannot delete outturn');
      }

      expect(deletionPrevented).toBe(true);

      // Clean up movement first, then outturn
      await sequelize.query('DELETE FROM rice_stock_movements WHERE id = $1', {
        bind: [movementResult[0].id]
      });

    } finally {
      // Now we can delete the outturn
      await testOutturn.destroy();
    }
  });

  test('foreign key constraint prevents invalid outturn references', async () => {
    const nonExistentOutturnId = 999999;

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
          CURRENT_DATE, 'purchase', 'Rice', 'TEST VARIETY', 10, 5.0,
          'A1', $1, 'approved', $2, NOW(), NOW()
        )
      `, {
        bind: [nonExistentOutturnId, testUser.id]
      });
    } catch (error) {
      foreignKeyViolation = true;
      expect(error.message).toMatch(/foreign key constraint|violates foreign key/i);
    }

    expect(foreignKeyViolation).toBe(true);
  });

  test('migration logging table exists and works', async () => {
    // Check if migration logging table exists
    const [tableExists] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'rice_stock_variety_migration_log'
    `);
    
    expect(tableExists.length).toBe(1);

    // Test inserting a log entry
    const [logResult] = await sequelize.query(`
      INSERT INTO rice_stock_variety_migration_log (
        rice_stock_movement_id, original_variety, migration_status, 
        migration_type, confidence_score, notes
      ) VALUES (
        1, 'TEST VARIETY', 'pending', 'automatic', 0.95, 'test log entry'
      ) RETURNING id
    `);

    expect(logResult[0].id).toBeTruthy();

    // Clean up
    await sequelize.query('DELETE FROM rice_stock_variety_migration_log WHERE id = $1', {
      bind: [logResult[0].id]
    });
  });
});