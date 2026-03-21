/**
 * Rice Stock Migration Rollback Script
 * 
 * Provides rollback functionality for rice stock variety standardization migration.
 * Can rollback specific migration or all migrations.
 * 
 * CRITICAL: This ONLY affects rice_stock_movements table.
 * It does NOT modify arrivals, hamali, location, or other systems.
 * 
 * Requirements: 7.5
 */

const { sequelize } = require('../config/database');

class RiceStockMigrationRollback {
  constructor() {
    this.rollbackId = null;
    this.startTime = null;
  }

  /**
   * Execute rollback for a specific migration or all migrations
   */
  async executeRollback(options = {}) {
    const { migrationId = null, dryRun = false, batchSize = 100 } = options;
    
    console.log('🔄 Starting Rice Stock Migration Rollback');
    console.log(`📋 Mode: ${dryRun ? 'DRY RUN' : 'LIVE ROLLBACK'}`);
    console.log(`🎯 Target: ${migrationId ? `Migration ${migrationId}` : 'ALL MIGRATIONS'}`);
    
    this.startTime = new Date();
    
    try {
      // Step 1: Initialize rollback logging
      this.rollbackId = await this.initializeRollbackLog(migrationId, dryRun);
      console.log(`📝 Rollback ID: ${this.rollbackId}`);

      // Step 2: Validate rollback target
      console.log('\n🔍 Step 1: Validating rollback target...');
      const targetMigrations = await this.validateRollbackTarget(migrationId);
      console.log(`✅ Found ${targetMigrations.length} migration(s) to rollback`);

      // Step 3: Create backup before rollback
      console.log('\n💾 Step 2: Creating backup...');
      const backupInfo = await this.createBackup(dryRun);
      console.log(`✅ Backup created: ${backupInfo.backupTable}`);

      // Step 4: Execute rollback
      console.log('\n🔄 Step 3: Executing rollback...');
      const rollbackResults = await this.executeRollbackOperations(targetMigrations, dryRun, batchSize);
      console.log(`✅ Rollback completed: ${rollbackResults.recordsRolledBack} records processed`);

      // Step 5: Validate rollback results
      console.log('\n✅ Step 4: Validating rollback results...');
      const validationResults = await this.validateRollbackResults(dryRun);
      console.log(`✅ Validation: ${validationResults.isValid ? 'PASSED' : 'FAILED'}`);

      // Step 6: Complete rollback
      await this.completeRollback(validationResults.isValid);
      
      const duration = (new Date() - this.startTime) / 1000;
      console.log(`\n🎉 Rollback ${dryRun ? 'Dry Run' : 'Execution'} Completed in ${duration.toFixed(2)}s`);
      
      return {
        rollbackId: this.rollbackId,
        success: validationResults.isValid,
        duration,
        recordsRolledBack: rollbackResults.recordsRolledBack,
        backupInfo,
        validationResults
      };

    } catch (error) {
      console.error('❌ Rollback failed:', error);
      await this.logRollbackError(error);
      throw error;
    }
  }

  /**
   * Initialize rollback logging
   */
  async initializeRollbackLog(migrationId, dryRun) {
    const [result] = await sequelize.query(`
      INSERT INTO rice_stock_migration_log (
        migration_type, status, started_at, dry_run, metadata
      ) VALUES (
        'rollback', 'in_progress', NOW(), $1, $2
      ) RETURNING id
    `, {
      replacements: [
        dryRun, 
        JSON.stringify({ 
          version: '1.0', 
          executor: 'RiceStockMigrationRollback',
          targetMigrationId: migrationId
        })
      ]
    });

    return result[0].id;
  }

  /**
   * Validate rollback target and get migration details
   */
  async validateRollbackTarget(migrationId) {
    let query, replacements;

    if (migrationId) {
      query = `
        SELECT id, migration_type, started_at, completed_at, status, metadata
        FROM rice_stock_migration_log 
        WHERE id = $1 AND migration_type = 'variety_standardization'
      `;
      replacements = [migrationId];
    } else {
      query = `
        SELECT id, migration_type, started_at, completed_at, status, metadata
        FROM rice_stock_migration_log 
        WHERE migration_type = 'variety_standardization' 
          AND status = 'completed'
        ORDER BY completed_at DESC
      `;
      replacements = [];
    }

    const [migrations] = await sequelize.query(query, { replacements });

    if (migrations.length === 0) {
      throw new Error(`No completed migrations found${migrationId ? ` for ID ${migrationId}` : ''}`);
    }

    return migrations;
  }

  /**
   * Create backup of current state
   */
  async createBackup(dryRun) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupTable = `rice_stock_movements_backup_${timestamp.substring(0, 19)}`;

    if (!dryRun) {
      await sequelize.query(`
        CREATE TABLE ${backupTable} AS 
        SELECT * FROM rice_stock_movements 
        WHERE outturn_id IS NOT NULL
      `);

      // Add indexes to backup table for performance
      await sequelize.query(`
        CREATE INDEX idx_${backupTable}_outturn_id ON ${backupTable}(outturn_id)
      `);
      await sequelize.query(`
        CREATE INDEX idx_${backupTable}_variety ON ${backupTable}(variety)
      `);
    }

    await this.logRollbackStep('backup_created', { backupTable, dryRun });

    return { backupTable, timestamp };
  }

  /**
   * Execute rollback operations
   */
  async executeRollbackOperations(targetMigrations, dryRun, batchSize) {
    let totalRecordsRolledBack = 0;

    for (const migration of targetMigrations) {
      console.log(`🔄 Rolling back migration ${migration.id} (${migration.started_at})`);

      // Get all records that were modified by this migration
      const [recordsToRollback] = await sequelize.query(`
        SELECT id, variety, outturn_id
        FROM rice_stock_movements 
        WHERE outturn_id IS NOT NULL
          AND updated_at >= $1
          AND (created_at < $1 OR created_at IS NULL)
        ORDER BY id
      `, {
        replacements: [migration.started_at]
      });

      console.log(`📦 Found ${recordsToRollback.length} records to rollback for migration ${migration.id}`);

      // Process in batches
      for (let i = 0; i < recordsToRollback.length; i += batchSize) {
        const batch = recordsToRollback.slice(i, i + batchSize);
        console.log(`📦 Processing rollback batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(recordsToRollback.length / batchSize)}`);

        if (!dryRun) {
          // Rollback by setting outturn_id to NULL
          const recordIds = batch.map(r => r.id);
          await sequelize.query(`
            UPDATE rice_stock_movements 
            SET outturn_id = NULL, 
                updated_at = NOW(),
                migration_rollback_id = $1
            WHERE id = ANY($2::integer[])
          `, {
            replacements: [this.rollbackId, recordIds]
          });
        }

        totalRecordsRolledBack += batch.length;

        // Log progress for large batches
        if (batch.length === batchSize) {
          console.log(`   ✅ Rolled back ${totalRecordsRolledBack} records so far...`);
        }

        // Small delay between batches
        if (i + batchSize < recordsToRollback.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      await this.logRollbackStep('migration_rolled_back', {
        migrationId: migration.id,
        recordsRolledBack: recordsToRollback.length
      });
    }

    return { recordsRolledBack: totalRecordsRolledBack };
  }

  /**
   * Validate rollback results
   */
  async validateRollbackResults(dryRun) {
    console.log('🔍 Validating rollback results...');

    try {
      // Check that outturn_id fields were properly cleared
      const [mappedRecords] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM rice_stock_movements 
        WHERE outturn_id IS NOT NULL
          AND migration_rollback_id = $1
      `);

      const remainingMappedRecords = parseInt(mappedRecords[0].count);

      // Check for orphaned records
      const [orphanedRecords] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM rice_stock_movements rsm
        LEFT JOIN outturns o ON rsm.outturn_id = o.id
        WHERE rsm.outturn_id IS NOT NULL 
          AND o.id IS NULL
          AND rsm.status = 'approved'
      `);

      const orphanedCount = parseInt(orphanedRecords[0].count);

      // Check data integrity
      const [integrityCheck] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM rice_stock_movements 
        WHERE variety IS NULL 
          AND outturn_id IS NULL
          AND status = 'approved'
      `);

      const integrityErrors = parseInt(integrityCheck[0].count);

      const isValid = remainingMappedRecords === 0 && orphanedCount === 0 && integrityErrors === 0;

      const validationResults = {
        isValid,
        remainingMappedRecords,
        orphanedCount,
        integrityErrors,
        timestamp: new Date()
      };

      await this.logRollbackStep('validation_completed', validationResults);

      console.log(`📊 Rollback Validation Results:`);
      console.log(`   Remaining mapped records: ${remainingMappedRecords}`);
      console.log(`   Orphaned records: ${orphanedCount}`);
      console.log(`   Integrity errors: ${integrityErrors}`);
      console.log(`   Overall status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

      return validationResults;

    } catch (error) {
      console.error('❌ Rollback validation failed:', error);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Log rollback step
   */
  async logRollbackStep(step, data) {
    await sequelize.query(`
      UPDATE rice_stock_migration_log 
      SET steps = COALESCE(steps, '[]'::jsonb) || $2::jsonb
      WHERE id = $1
    `, {
      replacements: [
        this.rollbackId,
        JSON.stringify([{ step, timestamp: new Date(), data }])
      ]
    });
  }

  /**
   * Complete rollback
   */
  async completeRollback(success) {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;

    await sequelize.query(`
      UPDATE rice_stock_migration_log 
      SET status = $2, completed_at = $3, duration_seconds = $4
      WHERE id = $1
    `, {
      replacements: [
        this.rollbackId,
        success ? 'completed' : 'failed',
        endTime,
        duration
      ]
    });

    console.log(`📝 Rollback log updated: ${success ? 'COMPLETED' : 'FAILED'}`);
  }

  /**
   * Log rollback error
   */
  async logRollbackError(error) {
    if (this.rollbackId) {
      await sequelize.query(`
        UPDATE rice_stock_migration_log 
        SET status = 'failed', error_message = $2, completed_at = NOW()
        WHERE id = $1
      `, {
        replacements: [this.rollbackId, error.message]
      });
    }
  }

  /**
   * List available migrations for rollback
   */
  async listAvailableMigrations() {
    const [migrations] = await sequelize.query(`
      SELECT 
        id, 
        started_at, 
        completed_at, 
        duration_seconds,
        metadata->>'version' as version,
        (
          SELECT COUNT(*) 
          FROM rice_stock_movements 
          WHERE outturn_id IS NOT NULL 
            AND updated_at >= rsml.started_at
        ) as affected_records
      FROM rice_stock_migration_log rsml
      WHERE migration_type = 'variety_standardization' 
        AND status = 'completed'
      ORDER BY completed_at DESC
    `);

    return migrations;
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const migrationId = args.find(arg => arg.startsWith('--migration-id='))?.split('=')[1];
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 100;
  const listMigrations = args.includes('--list');

  const rollback = new RiceStockMigrationRollback();

  if (listMigrations) {
    rollback.listAvailableMigrations()
      .then(migrations => {
        console.log('\n📋 Available Migrations for Rollback:');
        migrations.forEach(migration => {
          console.log(`   ID: ${migration.id}`);
          console.log(`   Date: ${migration.started_at}`);
          console.log(`   Duration: ${migration.duration_seconds}s`);
          console.log(`   Affected Records: ${migration.affected_records}`);
          console.log(`   Version: ${migration.version}`);
          console.log('   ---');
        });
        process.exit(0);
      })
      .catch(error => {
        console.error('❌ Failed to list migrations:', error);
        process.exit(1);
      });
  } else {
    rollback.executeRollback({ 
      migrationId: migrationId ? parseInt(migrationId) : null, 
      dryRun, 
      batchSize 
    })
      .then(result => {
        console.log('\n🎉 Rollback completed successfully');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ Rollback failed:', error);
        process.exit(1);
      });
  }
}

module.exports = RiceStockMigrationRollback;