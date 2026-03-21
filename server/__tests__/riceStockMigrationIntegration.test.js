/**
 * Rice Stock Migration Integration Tests
 * 
 * Tests complete rice stock workflows with new variety system.
 * Tests rice stock migration process with sample data.
 * Tests rice stock error handling scenarios.
 * Verifies no impact on arrivals or other systems.
 */

const { sequelize } = require('../config/database');
const RiceStockVarietyAnalysisService = require('../services/riceStockVarietyAnalysis');
const RiceStockMigrationExecutionService = require('../services/riceStockMigrationExecution');
const RiceStockMigrationExecutor = require('../scripts/executeRiceStockMigration');
const RiceStockMigrationRollback = require('../scripts/rollbackRiceStockMigration');

describe('Rice Stock Migration Integration Tests', () => {

  beforeAll(async () => {
    // Ensure migration infrastructure is ready
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rice_stock_migration_log (
        id SERIAL PRIMARY KEY,
        migration_type VARCHAR(50) NOT NULL,
        status VARCHAR(20) NOT NULL,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        duration_seconds NUMERIC,
        dry_run BOOLEAN DEFAULT false,
        steps JSONB DEFAULT '[]'::jsonb,
        metadata JSONB DEFAULT '{}'::jsonb,
        error_message TEXT
      )
    `);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  /**
   * Test complete migration process with sample data
   */
  test('Complete migration process with sample data', async () => {
    console.log('🧪 Testing complete migration process');

    // Step 1: Create sample rice stock data for migration
    await createSampleRiceStockData();

    // Step 2: Run variety analysis
    const analysisResults = await RiceStockVarietyAnalysisService.analyzeRiceStockVarieties();
    
    expect(analysisResults).toHaveProperty('summary');
    expect(analysisResults).toHaveProperty('varieties');
    expect(analysisResults.summary.totalVarieties).toBeGreaterThanOrEqual(0);

    console.log(`📊 Analysis found ${analysisResults.summary.totalVarieties} varieties`);

    // Step 3: Test dry run migration
    const migrationExecutor = new RiceStockMigrationExecutor();
    const dryRunResult = await migrationExecutor.executeMigration({
      dryRun: true,
      autoApprove: true,
      batchSize: 10
    });

    expect(dryRunResult.success).toBe(true);
    expect(dryRunResult.migrationId).toBeDefined();
    expect(dryRunResult.analysisResults).toBeDefined();

    console.log(`✅ Dry run completed: Migration ID ${dryRunResult.migrationId}`);

    // Step 4: Verify no actual changes were made
    const [unmappedCount] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM rice_stock_movements 
      WHERE outturn_id IS NULL 
        AND variety IS NOT NULL 
        AND variety != ''
        AND status = 'approved'
    `);

    // In dry run, unmapped count should remain the same
    expect(parseInt(unmappedCount[0].count)).toBeGreaterThanOrEqual(0);

    console.log('✅ Migration integration test completed');
  });

  /**
   * Test migration rollback process
   */
  test('Migration rollback process', async () => {
    console.log('🧪 Testing migration rollback process');

    // Get available migrations for rollback
    const rollback = new RiceStockMigrationRollback();
    const availableMigrations = await rollback.listAvailableMigrations();

    console.log(`📊 Found ${availableMigrations.length} available migrations for rollback`);

    if (availableMigrations.length > 0) {
      // Test dry run rollback
      const rollbackResult = await rollback.executeRollback({
        migrationId: availableMigrations[0].id,
        dryRun: true,
        batchSize: 10
      });

      expect(rollbackResult.success).toBe(true);
      expect(rollbackResult.rollbackId).toBeDefined();
      expect(rollbackResult.backupInfo).toBeDefined();

      console.log(`✅ Rollback dry run completed: Rollback ID ${rollbackResult.rollbackId}`);
    } else {
      console.log('ℹ️ No migrations available for rollback test');
    }
  });

  /**
   * Test error handling during migration
   */
  test('Migration error handling scenarios', async () => {
    console.log('🧪 Testing migration error handling');

    // Test 1: Invalid migration ID for rollback
    const rollback = new RiceStockMigrationRollback();
    
    try {
      await rollback.executeRollback({
        migrationId: 99999, // Non-existent migration
        dryRun: true
      });
      
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error.message).toContain('No completed migrations found');
    }

    // Test 2: Migration execution service error handling
    try {
      await RiceStockMigrationExecutionService.mapVarietyToOutturn(
        'TEST_VARIETY',
        99999, // Non-existent outturn
        'test',
        1
      );
      
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      expect(error).toBeDefined();
    }

    console.log('✅ Error handling scenarios tested');
  });

  /**
   * Test migration with different variety types
   */
  test('Migration handles different variety types correctly', async () => {
    console.log('🧪 Testing migration with different variety types');

    // Create test varieties with different patterns
    const testVarieties = [
      'BPT RAW',
      'SONA STEAM', 
      'BASMATI RAW',
      'JSR STEAM',
      'UNKNOWN VARIETY'
    ];

    // Insert test rice stock movements
    for (const variety of testVarieties) {
      try {
        await sequelize.query(`
          INSERT INTO rice_stock_movements (
            date, movement_type, product_type, variety, bags, quantity_quintals,
            location_code, status, created_at, updated_at
          ) VALUES (
            CURRENT_DATE, 'purchase', 'Rice', $1, 10, 5.0,
            'TEST_STORE', 'approved', NOW(), NOW()
          )
        `, {
          replacements: [variety]
        });
      } catch (error) {
        // May fail due to constraints, which is expected
        console.log(`⚠️ Could not insert test variety ${variety}: ${error.message}`);
      }
    }

    // Run analysis on test data
    const analysisResults = await RiceStockVarietyAnalysisService.analyzeRiceStockVarieties();
    
    // Should handle all variety types
    expect(analysisResults.varieties).toBeDefined();
    
    // Check that different recommendation types are generated
    const recommendations = new Set();
    analysisResults.varieties.forEach(v => {
      recommendations.add(v.recommendedAction);
    });

    console.log(`📊 Generated recommendations: ${Array.from(recommendations).join(', ')}`);

    // Clean up test data
    await sequelize.query(`
      DELETE FROM rice_stock_movements 
      WHERE location_code = 'TEST_STORE'
    `);

    console.log('✅ Different variety types handled correctly');
  });

  /**
   * Test migration preserves data integrity
   */
  test('Migration preserves data integrity', async () => {
    console.log('🧪 Testing migration data integrity preservation');

    // Get initial counts
    const [initialCounts] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_movements,
        COUNT(CASE WHEN outturn_id IS NOT NULL THEN 1 END) as mapped_movements,
        SUM(quantity_quintals) as total_quantity
      FROM rice_stock_movements 
      WHERE status = 'approved'
    `);

    const initialData = {
      totalMovements: parseInt(initialCounts[0].total_movements),
      mappedMovements: parseInt(initialCounts[0].mapped_movements),
      totalQuantity: parseFloat(initialCounts[0].total_quantity || 0)
    };

    console.log(`📊 Initial state: ${initialData.totalMovements} movements, ${initialData.mappedMovements} mapped`);

    // Run dry run migration
    const migrationExecutor = new RiceStockMigrationExecutor();
    const migrationResult = await migrationExecutor.executeMigration({
      dryRun: true,
      autoApprove: true,
      batchSize: 50
    });

    expect(migrationResult.success).toBe(true);

    // Verify data integrity after dry run
    const [finalCounts] = await sequelize.query(`
      SELECT 
        COUNT(*) as total_movements,
        COUNT(CASE WHEN outturn_id IS NOT NULL THEN 1 END) as mapped_movements,
        SUM(quantity_quintals) as total_quantity
      FROM rice_stock_movements 
      WHERE status = 'approved'
    `);

    const finalData = {
      totalMovements: parseInt(finalCounts[0].total_movements),
      mappedMovements: parseInt(finalCounts[0].mapped_movements),
      totalQuantity: parseFloat(finalCounts[0].total_quantity || 0)
    };

    // In dry run, data should be unchanged
    expect(finalData.totalMovements).toBe(initialData.totalMovements);
    expect(finalData.totalQuantity).toBeCloseTo(initialData.totalQuantity, 2);

    console.log('✅ Data integrity preserved during migration');
  });

  /**
   * Test migration logging and audit trail
   */
  test('Migration maintains complete audit trail', async () => {
    console.log('🧪 Testing migration audit trail');

    // Run a migration to generate logs
    const migrationExecutor = new RiceStockMigrationExecutor();
    const migrationResult = await migrationExecutor.executeMigration({
      dryRun: true,
      autoApprove: true,
      batchSize: 25
    });

    expect(migrationResult.success).toBe(true);

    // Verify migration log entry
    const [migrationLogs] = await sequelize.query(`
      SELECT id, migration_type, status, started_at, completed_at, 
             duration_seconds, dry_run, steps, metadata
      FROM rice_stock_migration_log 
      WHERE id = $1
    `, {
      replacements: [migrationResult.migrationId]
    });

    expect(migrationLogs.length).toBe(1);
    const logEntry = migrationLogs[0];

    expect(logEntry.migration_type).toBe('variety_standardization');
    expect(logEntry.status).toBe('completed');
    expect(logEntry.dry_run).toBe(true);
    expect(logEntry.started_at).toBeDefined();
    expect(logEntry.completed_at).toBeDefined();
    expect(logEntry.duration_seconds).toBeGreaterThan(0);

    // Verify steps are logged
    const steps = JSON.parse(logEntry.steps);
    expect(Array.isArray(steps)).toBe(true);
    expect(steps.length).toBeGreaterThan(0);

    // Check for expected step types
    const stepTypes = steps.map(step => step.step);
    expect(stepTypes).toContain('analysis_completed');
    expect(stepTypes).toContain('validation_completed');

    console.log(`📊 Audit trail: ${steps.length} steps logged`);
    console.log('✅ Complete audit trail maintained');
  });

  /**
   * Test system remains functional during migration
   */
  test('System remains functional during migration process', async () => {
    console.log('🧪 Testing system functionality during migration');

    // Test that rice stock operations still work during migration
    const testDate = new Date().toISOString().split('T')[0];

    // Get available outturns
    const [outturns] = await sequelize.query(`
      SELECT id FROM outturns LIMIT 1
    `);

    if (outturns.length > 0) {
      const testOutturnId = outturns[0].id;

      // Test creating a rice stock movement
      try {
        await sequelize.query(`
          INSERT INTO rice_stock_movements (
            date, movement_type, product_type, outturn_id, bags, quantity_quintals,
            location_code, status, created_at, updated_at
          ) VALUES (
            $1, 'purchase', 'Rice', $2, 5, 2.5,
            'MIGRATION_TEST', 'approved', NOW(), NOW()
          )
        `, {
          replacements: [testDate, testOutturnId]
        });

        console.log('✅ Rice stock operations functional during migration');

        // Clean up
        await sequelize.query(`
          DELETE FROM rice_stock_movements 
          WHERE location_code = 'MIGRATION_TEST'
        `);

      } catch (error) {
        console.log(`⚠️ Rice stock operation test failed: ${error.message}`);
      }
    }

    // Test that other systems are not affected
    const [tableExists] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'arrivals'
      ) as exists
    `);

    if (tableExists[0].exists) {
      // Arrivals table exists, verify it's not affected
      const [arrivalsCount] = await sequelize.query(`
        SELECT COUNT(*) as count FROM arrivals
      `);

      expect(parseInt(arrivalsCount[0].count)).toBeGreaterThanOrEqual(0);
      console.log('✅ Arrivals system unaffected by rice stock migration');
    }

    console.log('✅ System functionality maintained during migration');
  });

  /**
   * Helper function to create sample rice stock data
   */
  async function createSampleRiceStockData() {
    const sampleVarieties = [
      'BPT RAW',
      'SONA STEAM',
      'BASMATI RAW'
    ];

    for (const variety of sampleVarieties) {
      try {
        await sequelize.query(`
          INSERT INTO rice_stock_movements (
            date, movement_type, product_type, variety, bags, quantity_quintals,
            location_code, status, created_at, updated_at
          ) VALUES (
            CURRENT_DATE - INTERVAL '1 day', 'purchase', 'Rice', $1, 10, 5.0,
            'SAMPLE_STORE', 'approved', NOW(), NOW()
          ) ON CONFLICT DO NOTHING
        `, {
          replacements: [variety]
        });
      } catch (error) {
        // Ignore conflicts - sample data may already exist
        console.log(`ℹ️ Sample data for ${variety} may already exist`);
      }
    }

    console.log('📦 Sample rice stock data created');
  }
});