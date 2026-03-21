const { sequelize } = require('../config/database');
const Outturn = require('../models/Outturn');
const riceStockVarietyAnalysis = require('./riceStockVarietyAnalysis');

/**
 * Rice Stock Migration Execution Service
 * 
 * Executes the actual migration of rice stock movements from free-text varieties
 * to standardized outturn references. This service ONLY affects rice stock operations
 * (Purchase, Sale, Palti) and does NOT modify arrivals, hamali, location, or other systems.
 */
class RiceStockMigrationExecutionService {

  /**
   * Execute complete rice stock variety migration
   * @param {Object} options - Migration options
   * @returns {Promise<Object>} Migration results
   */
  async executeRiceStockMigration(options = {}) {
    const {
      dryRun = false,
      autoMapHighConfidence = true,
      confidenceThreshold = 0.95,
      createMissingOutturns = true,
      batchSize = 100
    } = options;

    console.log('🚀 Starting rice stock variety migration...');
    console.log(`📋 Options: dryRun=${dryRun}, autoMap=${autoMapHighConfidence}, threshold=${confidenceThreshold}`);

    const migrationResults = {
      timestamp: new Date(),
      options,
      summary: {
        totalVarieties: 0,
        autoMapped: 0,
        manuallyMapped: 0,
        newOutturnsCreated: 0,
        failed: 0,
        skipped: 0,
        totalMovementsUpdated: 0
      },
      details: [],
      errors: []
    };

    try {
      // Step 1: Analyze current rice stock varieties
      console.log('🔍 Step 1: Analyzing rice stock varieties...');
      const analysisResults = await riceStockVarietyAnalysis.analyzeRiceStockVarieties();
      migrationResults.summary.totalVarieties = analysisResults.varieties.length;

      console.log(`📊 Found ${analysisResults.varieties.length} varieties to migrate`);

      // Step 2: Process each variety
      for (const variety of analysisResults.varieties) {
        try {
          const varietyResult = await this.processVarietyMigration(variety, options, dryRun);
          migrationResults.details.push(varietyResult);
          
          // Update summary counters
          switch (varietyResult.action) {
            case 'auto_mapped':
              migrationResults.summary.autoMapped++;
              migrationResults.summary.totalMovementsUpdated += varietyResult.movementsUpdated;
              break;
            case 'manually_mapped':
              migrationResults.summary.manuallyMapped++;
              migrationResults.summary.totalMovementsUpdated += varietyResult.movementsUpdated;
              break;
            case 'new_outturn_created':
              migrationResults.summary.newOutturnsCreated++;
              migrationResults.summary.totalMovementsUpdated += varietyResult.movementsUpdated;
              break;
            case 'failed':
              migrationResults.summary.failed++;
              break;
            case 'skipped':
              migrationResults.summary.skipped++;
              break;
          }

        } catch (error) {
          console.error(`❌ Error processing variety ${variety.originalVariety}:`, error.message);
          migrationResults.errors.push({
            variety: variety.originalVariety,
            error: error.message,
            timestamp: new Date()
          });
          migrationResults.summary.failed++;
        }
      }

      // Step 3: Generate final report
      console.log('📈 Migration completed!');
      console.log(`✅ Auto-mapped: ${migrationResults.summary.autoMapped}`);
      console.log(`🔧 Manually mapped: ${migrationResults.summary.manuallyMapped}`);
      console.log(`🆕 New outturns created: ${migrationResults.summary.newOutturnsCreated}`);
      console.log(`❌ Failed: ${migrationResults.summary.failed}`);
      console.log(`⏭️ Skipped: ${migrationResults.summary.skipped}`);
      console.log(`📊 Total movements updated: ${migrationResults.summary.totalMovementsUpdated}`);

      return migrationResults;

    } catch (error) {
      console.error('❌ Migration failed:', error);
      migrationResults.errors.push({
        general: error.message,
        timestamp: new Date()
      });
      throw error;
    }
  }

  /**
   * Process migration for a single variety
   * @param {Object} variety - Variety analysis result
   * @param {Object} options - Migration options
   * @param {boolean} dryRun - Whether this is a dry run
   * @returns {Promise<Object>} Processing result
   */
  async processVarietyMigration(variety, options, dryRun) {
    const {
      autoMapHighConfidence = true,
      confidenceThreshold = 0.95,
      createMissingOutturns = true
    } = options;

    console.log(`🔄 Processing variety: ${variety.originalVariety}`);

    const result = {
      originalVariety: variety.originalVariety,
      usageCount: variety.usageCount,
      action: 'skipped',
      outturnId: null,
      outturnCode: null,
      confidence: variety.confidence,
      movementsUpdated: 0,
      reason: '',
      timestamp: new Date()
    };

    try {
      // Determine action based on analysis
      if (variety.potentialMatches.length > 0 && variety.confidence >= confidenceThreshold && autoMapHighConfidence) {
        // Auto-map high confidence matches
        const bestMatch = variety.potentialMatches[0];
        result.action = 'auto_mapped';
        result.outturnId = bestMatch.outturnId;
        result.outturnCode = bestMatch.outturnCode;
        result.reason = `Auto-mapped with ${(bestMatch.confidence * 100).toFixed(1)}% confidence: ${bestMatch.reason}`;

        if (!dryRun) {
          result.movementsUpdated = await this.updateRiceStockMovements(
            variety.originalVariety, 
            bestMatch.outturnId,
            'auto_map'
          );
        } else {
          result.movementsUpdated = variety.usageCount;
        }

      } else if (variety.potentialMatches.length > 0 && variety.confidence >= 0.8) {
        // Mark for manual review but don't auto-map
        result.action = 'skipped';
        result.reason = `Needs manual review - confidence ${(variety.confidence * 100).toFixed(1)}% below threshold`;

      } else if (variety.potentialMatches.length === 0 && createMissingOutturns) {
        // Create new outturn for unmapped varieties
        result.action = 'new_outturn_created';
        
        if (!dryRun) {
          const newOutturn = await this.createOutturnFromVariety(variety.originalVariety);
          result.outturnId = newOutturn.id;
          result.outturnCode = newOutturn.code;
          result.reason = `Created new outturn: ${newOutturn.code}`;

          result.movementsUpdated = await this.updateRiceStockMovements(
            variety.originalVariety,
            newOutturn.id,
            'create_new'
          );
        } else {
          result.outturnCode = `NEW_${variety.originalVariety.replace(/[^A-Z0-9]/g, '_')}`;
          result.reason = `Would create new outturn: ${result.outturnCode}`;
          result.movementsUpdated = variety.usageCount;
        }

      } else {
        // Skip - no action taken
        result.action = 'skipped';
        result.reason = 'No suitable matches found and new outturn creation disabled';
      }

      console.log(`  ✅ ${result.action}: ${result.reason}`);
      return result;

    } catch (error) {
      result.action = 'failed';
      result.reason = error.message;
      console.log(`  ❌ Failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Update rice stock movements to use outturn reference
   * @param {string} originalVariety - Original variety string
   * @param {number} outturnId - Target outturn ID
   * @param {string} migrationType - Type of migration
   * @returns {Promise<number>} Number of movements updated
   */
  async updateRiceStockMovements(originalVariety, outturnId, migrationType) {
    console.log(`    📝 Updating movements for variety: ${originalVariety} → outturn ${outturnId}`);

    const transaction = await sequelize.transaction();

    try {
      // Get all movements for this variety
      const [movements] = await sequelize.query(`
        SELECT id, variety, movement_type, product_type, bags, quantity_quintals, location_code
        FROM rice_stock_movements 
        WHERE TRIM(UPPER(variety)) = TRIM(UPPER($1))
          AND outturn_id IS NULL
          AND status = 'approved'
      `, {
        bind: [originalVariety],
        transaction
      });

      if (movements.length === 0) {
        await transaction.rollback();
        return 0;
      }

      // Update movements with outturn reference
      const [updateResult] = await sequelize.query(`
        UPDATE rice_stock_movements 
        SET outturn_id = $1, updated_at = NOW()
        WHERE TRIM(UPPER(variety)) = TRIM(UPPER($2))
          AND outturn_id IS NULL
          AND status = 'approved'
      `, {
        bind: [outturnId, originalVariety],
        transaction
      });

      // Log migration for each movement
      for (const movement of movements) {
        await sequelize.query(`
          INSERT INTO rice_stock_variety_migration_log (
            rice_stock_movement_id, original_variety, matched_outturn_id,
            migration_status, migration_type, confidence_score,
            migration_date, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
        `, {
          bind: [
            movement.id,
            originalVariety,
            outturnId,
            'matched',
            migrationType === 'auto_map' ? 'automatic' : 'manual',
            migrationType === 'auto_map' ? 0.95 : 1.0,
            `Migrated ${movement.movement_type} movement: ${movement.bags} bags, ${movement.quantity_quintals} quintals`
          ],
          transaction
        });
      }

      await transaction.commit();
      console.log(`    ✅ Updated ${movements.length} movements`);
      return movements.length;

    } catch (error) {
      await transaction.rollback();
      console.error(`    ❌ Failed to update movements:`, error.message);
      throw error;
    }
  }

  /**
   * Create new outturn from variety string
   * @param {string} varietyString - Original variety string
   * @returns {Promise<Object>} Created outturn
   */
  async createOutturnFromVariety(varietyString) {
    console.log(`    🆕 Creating new outturn for variety: ${varietyString}`);

    // Parse variety string to extract allotted variety and type
    const { allottedVariety, type } = this.parseVarietyString(varietyString);
    
    // Generate unique code
    const timestamp = Date.now();
    const code = `AUTO_${allottedVariety.replace(/[^A-Z0-9]/g, '_')}_${type}_${timestamp}`;

    // Get system user for creation
    const systemUser = await this.getSystemUser();

    const newOutturn = await Outturn.create({
      code: code,
      allottedVariety: allottedVariety,
      type: type,
      createdBy: systemUser.id
    });

    console.log(`    ✅ Created outturn: ${newOutturn.code} (ID: ${newOutturn.id})`);
    return newOutturn;
  }

  /**
   * Parse variety string to extract components
   * @param {string} varietyString - Variety string to parse
   * @returns {Object} Parsed components
   */
  parseVarietyString(varietyString) {
    const cleanVariety = varietyString.toUpperCase().trim();
    
    // Remove TEST_ prefix if present
    const withoutTest = cleanVariety.replace(/^TEST_/, '');
    
    // Check for type indicators
    let type = 'Raw'; // Default
    let allottedVariety = withoutTest;
    
    if (withoutTest.includes('STEAM') || withoutTest.includes('STM')) {
      type = 'Steam';
      allottedVariety = withoutTest.replace(/\s*(STEAM|STM)\s*$/, '').trim();
    } else if (withoutTest.includes('RAW')) {
      type = 'Raw';
      allottedVariety = withoutTest.replace(/\s*RAW\s*$/, '').trim();
    }

    // Clean up allotted variety
    allottedVariety = allottedVariety.trim();
    if (!allottedVariety) {
      allottedVariety = 'UNKNOWN';
    }

    return { allottedVariety, type };
  }

  /**
   * Get or create system user for automated operations
   * @returns {Promise<Object>} System user
   */
  async getSystemUser() {
    const User = require('../models/User');
    
    let systemUser = await User.findOne({ where: { username: 'system_migration' } });
    if (!systemUser) {
      systemUser = await User.create({
        username: 'system_migration',
        password: 'system_generated',
        role: 'admin'
      });
    }
    
    return systemUser;
  }

  /**
   * Rollback rice stock migration for a specific variety
   * @param {string} originalVariety - Original variety to rollback
   * @returns {Promise<Object>} Rollback result
   */
  async rollbackVarietyMigration(originalVariety) {
    console.log(`🔄 Rolling back migration for variety: ${originalVariety}`);

    const transaction = await sequelize.transaction();

    try {
      // Get migration log entries
      const [logEntries] = await sequelize.query(`
        SELECT rice_stock_movement_id, matched_outturn_id, created_outturn_id
        FROM rice_stock_variety_migration_log
        WHERE original_variety = $1
          AND migration_status = 'matched'
      `, {
        bind: [originalVariety],
        transaction
      });

      if (logEntries.length === 0) {
        await transaction.rollback();
        return { success: false, message: 'No migration found for this variety' };
      }

      // Reset outturn_id to NULL for affected movements
      await sequelize.query(`
        UPDATE rice_stock_movements 
        SET outturn_id = NULL, updated_at = NOW()
        WHERE id = ANY($1)
      `, {
        bind: [logEntries.map(entry => entry.rice_stock_movement_id)],
        transaction
      });

      // Update migration log status
      await sequelize.query(`
        UPDATE rice_stock_variety_migration_log
        SET migration_status = 'failed', updated_at = NOW()
        WHERE original_variety = $1
          AND migration_status = 'matched'
      `, {
        bind: [originalVariety],
        transaction
      });

      await transaction.commit();

      console.log(`✅ Rolled back ${logEntries.length} movements for variety: ${originalVariety}`);
      return {
        success: true,
        message: `Rolled back ${logEntries.length} movements`,
        movementsAffected: logEntries.length
      };

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Get migration status and statistics
   * @returns {Promise<Object>} Migration status
   */
  async getMigrationStatus() {
    try {
      // Get overall statistics
      const [stats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_movements,
          COUNT(outturn_id) as mapped_movements,
          COUNT(*) - COUNT(outturn_id) as unmapped_movements
        FROM rice_stock_movements 
        WHERE status = 'approved'
      `);

      const [varietyStats] = await sequelize.query(`
        SELECT 
          COUNT(DISTINCT variety) as total_varieties,
          COUNT(DISTINCT CASE WHEN outturn_id IS NOT NULL THEN variety END) as mapped_varieties
        FROM rice_stock_movements 
        WHERE status = 'approved'
      `);

      const [migrationLog] = await sequelize.query(`
        SELECT 
          migration_status,
          COUNT(*) as count
        FROM rice_stock_variety_migration_log
        GROUP BY migration_status
      `);

      return {
        timestamp: new Date(),
        movements: stats[0],
        varieties: varietyStats[0],
        migrationLog: migrationLog,
        completionPercentage: stats[0].total_movements > 0 
          ? Math.round((stats[0].mapped_movements / stats[0].total_movements) * 100)
          : 0
      };

    } catch (error) {
      console.error('❌ Error getting migration status:', error);
      throw error;
    }
  }
}

module.exports = new RiceStockMigrationExecutionService();