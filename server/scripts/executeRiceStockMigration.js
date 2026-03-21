/**
 * Execute Rice Stock Data Migration
 * 
 * This script executes the rice stock variety standardization migration,
 * converting free-text varieties to outturn-based references.
 * 
 * CRITICAL: This ONLY affects rice_stock_movements table.
 * It does NOT modify arrivals, hamali, location, or other systems.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

const { sequelize } = require('../config/database');
const RiceStockVarietyAnalysisService = require('../services/riceStockVarietyAnalysis');
const RiceStockMigrationExecutionService = require('../services/riceStockMigrationExecution');

class RiceStockMigrationExecutor {
  constructor() {
    this.migrationId = null;
    this.startTime = null;
    this.analysisResults = null;
  }

  /**
   * Execute the complete rice stock migration process
   */
  async executeMigration(options = {}) {
    const { dryRun = false, autoApprove = false, batchSize = 100 } = options;
    
    console.log('🚀 Starting Rice Stock Variety Standardization Migration');
    console.log(`📋 Mode: ${dryRun ? 'DRY RUN' : 'LIVE MIGRATION'}`);
    console.log(`🔧 Auto-approve: ${autoApprove ? 'YES' : 'NO'}`);
    console.log(`📦 Batch size: ${batchSize}`);
    
    this.startTime = new Date();
    
    try {
      // Step 1: Initialize migration logging
      this.migrationId = await this.initializeMigrationLog(dryRun);
      console.log(`📝 Migration ID: ${this.migrationId}`);

      // Step 2: Analyze existing rice stock varieties
      console.log('\n🔍 Step 1: Analyzing rice stock varieties...');
      this.analysisResults = await RiceStockVarietyAnalysisService.analyzeRiceStockVarieties();
      
      await this.logMigrationStep('analysis_completed', {
        totalVarieties: this.analysisResults.summary.totalVarieties,
        exactMatches: this.analysisResults.summary.exactMatches,
        fuzzyMatches: this.analysisResults.summary.fuzzyMatches,
        noMatches: this.analysisResults.summary.noMatches
      });

      console.log(`✅ Analysis completed: ${this.analysisResults.summary.totalVarieties} varieties analyzed`);
      this.printAnalysisSummary();

      // Step 3: Execute automatic mappings
      console.log('\n🤖 Step 2: Executing automatic mappings...');
      const autoMappableVarieties = RiceStockVarietyAnalysisService.getAutoMappableVarieties(this.analysisResults);
      
      if (autoMappableVarieties.length > 0) {
        const autoMappingResults = await this.executeAutomaticMappings(autoMappableVarieties, dryRun, batchSize);
        console.log(`✅ Automatic mappings: ${autoMappingResults.successCount} successful, ${autoMappingResults.errorCount} errors`);
      } else {
        console.log('ℹ️ No varieties suitable for automatic mapping');
      }

      // Step 4: Handle varieties needing review
      console.log('\n👀 Step 3: Processing varieties needing review...');
      const reviewVarieties = RiceStockVarietyAnalysisService.getVarietiesNeedingReview(this.analysisResults);
      
      if (reviewVarieties.length > 0) {
        if (autoApprove) {
          const reviewResults = await this.executeReviewMappings(reviewVarieties, dryRun, batchSize);
          console.log(`✅ Review mappings: ${reviewResults.successCount} successful, ${reviewResults.errorCount} errors`);
        } else {
          console.log(`⚠️ ${reviewVarieties.length} varieties need manual review (use --auto-approve to process automatically)`);
          this.printReviewVarieties(reviewVarieties);
        }
      } else {
        console.log('ℹ️ No varieties need review');
      }

      // Step 5: Create new outturns for unmapped varieties
      console.log('\n🆕 Step 4: Creating new outturns for unmapped varieties...');
      const newOutturnVarieties = RiceStockVarietyAnalysisService.getVarietiesNeedingNewOutturns(this.analysisResults);
      
      if (newOutturnVarieties.length > 0) {
        const newOutturnResults = await this.createNewOutturns(newOutturnVarieties, dryRun);
        console.log(`✅ New outturns: ${newOutturnResults.successCount} created, ${newOutturnResults.errorCount} errors`);
      } else {
        console.log('ℹ️ No new outturns needed');
      }

      // Step 6: Validate migration results
      console.log('\n✅ Step 5: Validating migration results...');
      const validationResults = await this.validateMigrationResults(dryRun);
      console.log(`✅ Validation completed: ${validationResults.isValid ? 'PASSED' : 'FAILED'}`);

      // Step 7: Complete migration
      await this.completeMigration(validationResults.isValid);
      
      const duration = (new Date() - this.startTime) / 1000;
      console.log(`\n🎉 Rice Stock Migration ${dryRun ? 'Dry Run' : 'Execution'} Completed in ${duration.toFixed(2)}s`);
      
      return {
        migrationId: this.migrationId,
        success: validationResults.isValid,
        duration,
        analysisResults: this.analysisResults,
        validationResults
      };

    } catch (error) {
      console.error('❌ Migration failed:', error);
      await this.logMigrationError(error);
      throw error;
    }
  }

  /**
   * Initialize migration logging
   */
  async initializeMigrationLog(dryRun) {
    const [result] = await sequelize.query(`
      INSERT INTO rice_stock_migration_log (
        migration_type, status, started_at, dry_run, metadata
      ) VALUES (
        'variety_standardization', 'in_progress', NOW(), $1, $2
      ) RETURNING id
    `, {
      replacements: [dryRun, JSON.stringify({ version: '1.0', executor: 'RiceStockMigrationExecutor' })]
    });

    return result[0].id;
  }

  /**
   * Log migration step
   */
  async logMigrationStep(step, data) {
    await sequelize.query(`
      UPDATE rice_stock_migration_log 
      SET steps = COALESCE(steps, '[]'::jsonb) || $2::jsonb
      WHERE id = $1
    `, {
      replacements: [
        this.migrationId,
        JSON.stringify([{ step, timestamp: new Date(), data }])
      ]
    });
  }

  /**
   * Execute automatic mappings for high-confidence matches
   */
  async executeAutomaticMappings(varieties, dryRun, batchSize) {
    let successCount = 0;
    let errorCount = 0;

    console.log(`🤖 Processing ${varieties.length} auto-mappable varieties in batches of ${batchSize}`);

    for (let i = 0; i < varieties.length; i += batchSize) {
      const batch = varieties.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(varieties.length / batchSize)}`);

      for (const variety of batch) {
        try {
          const bestMatch = variety.potentialMatches[0];
          
          if (!dryRun) {
            await RiceStockMigrationExecutionService.mapVarietyToOutturn(
              variety.originalVariety,
              bestMatch.outturnId,
              'automatic',
              this.migrationId
            );
          }

          console.log(`✅ ${variety.originalVariety} → ${bestMatch.standardizedVariety} (${bestMatch.confidence.toFixed(2)})`);
          successCount++;

        } catch (error) {
          console.error(`❌ Failed to map ${variety.originalVariety}:`, error.message);
          errorCount++;
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + batchSize < varieties.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    await this.logMigrationStep('automatic_mappings_completed', { successCount, errorCount });
    return { successCount, errorCount };
  }

  /**
   * Execute mappings for varieties needing review
   */
  async executeReviewMappings(varieties, dryRun, batchSize) {
    let successCount = 0;
    let errorCount = 0;

    console.log(`👀 Processing ${varieties.length} review varieties in batches of ${batchSize}`);

    for (let i = 0; i < varieties.length; i += batchSize) {
      const batch = varieties.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(varieties.length / batchSize)}`);

      for (const variety of batch) {
        try {
          if (variety.potentialMatches.length > 0) {
            const bestMatch = variety.potentialMatches[0];
            
            if (!dryRun) {
              await RiceStockMigrationExecutionService.mapVarietyToOutturn(
                variety.originalVariety,
                bestMatch.outturnId,
                'review_approved',
                this.migrationId
              );
            }

            console.log(`✅ ${variety.originalVariety} → ${bestMatch.standardizedVariety} (${bestMatch.confidence.toFixed(2)}) [REVIEW]`);
            successCount++;
          } else {
            console.log(`⚠️ ${variety.originalVariety} has no potential matches, skipping`);
          }

        } catch (error) {
          console.error(`❌ Failed to map ${variety.originalVariety}:`, error.message);
          errorCount++;
        }
      }

      if (i + batchSize < varieties.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    await this.logMigrationStep('review_mappings_completed', { successCount, errorCount });
    return { successCount, errorCount };
  }

  /**
   * Create new outturns for unmapped varieties
   */
  async createNewOutturns(varieties, dryRun) {
    let successCount = 0;
    let errorCount = 0;

    console.log(`🆕 Creating ${varieties.length} new outturns`);

    for (const variety of varieties) {
      try {
        if (!dryRun) {
          const newOutturnId = await RiceStockMigrationExecutionService.createOutturnForVariety(
            variety.originalVariety,
            this.migrationId
          );

          await RiceStockMigrationExecutionService.mapVarietyToOutturn(
            variety.originalVariety,
            newOutturnId,
            'new_outturn_created',
            this.migrationId
          );
        }

        console.log(`✅ Created new outturn for: ${variety.originalVariety}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Failed to create outturn for ${variety.originalVariety}:`, error.message);
        errorCount++;
      }
    }

    await this.logMigrationStep('new_outturns_created', { successCount, errorCount });
    return { successCount, errorCount };
  }

  /**
   * Validate migration results
   */
  async validateMigrationResults(dryRun) {
    console.log('🔍 Validating migration results...');

    try {
      // Check for unmapped varieties
      const [unmappedCount] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM rice_stock_movements 
        WHERE outturn_id IS NULL 
          AND variety IS NOT NULL 
          AND variety != ''
          AND status = 'approved'
      `);

      const unmappedVarieties = parseInt(unmappedCount[0].count);

      // Check referential integrity
      const [integrityCheck] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM rice_stock_movements rsm
        LEFT JOIN outturns o ON rsm.outturn_id = o.id
        WHERE rsm.outturn_id IS NOT NULL 
          AND o.id IS NULL
          AND rsm.status = 'approved'
      `);

      const integrityErrors = parseInt(integrityCheck[0].count);

      // Check for duplicate mappings
      const [duplicateCheck] = await sequelize.query(`
        SELECT variety, COUNT(DISTINCT outturn_id) as outturn_count
        FROM rice_stock_movements 
        WHERE outturn_id IS NOT NULL 
          AND variety IS NOT NULL
          AND status = 'approved'
        GROUP BY variety
        HAVING COUNT(DISTINCT outturn_id) > 1
      `);

      const duplicateMappings = duplicateCheck.length;

      const isValid = unmappedVarieties === 0 && integrityErrors === 0 && duplicateMappings === 0;

      const validationResults = {
        isValid,
        unmappedVarieties,
        integrityErrors,
        duplicateMappings,
        timestamp: new Date()
      };

      await this.logMigrationStep('validation_completed', validationResults);

      console.log(`📊 Validation Results:`);
      console.log(`   Unmapped varieties: ${unmappedVarieties}`);
      console.log(`   Integrity errors: ${integrityErrors}`);
      console.log(`   Duplicate mappings: ${duplicateMappings}`);
      console.log(`   Overall status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

      return validationResults;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * Complete migration
   */
  async completeMigration(success) {
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;

    await sequelize.query(`
      UPDATE rice_stock_migration_log 
      SET status = $2, completed_at = $3, duration_seconds = $4
      WHERE id = $1
    `, {
      replacements: [
        this.migrationId,
        success ? 'completed' : 'failed',
        endTime,
        duration
      ]
    });

    console.log(`📝 Migration log updated: ${success ? 'COMPLETED' : 'FAILED'}`);
  }

  /**
   * Log migration error
   */
  async logMigrationError(error) {
    if (this.migrationId) {
      await sequelize.query(`
        UPDATE rice_stock_migration_log 
        SET status = 'failed', error_message = $2, completed_at = NOW()
        WHERE id = $1
      `, {
        replacements: [this.migrationId, error.message]
      });
    }
  }

  /**
   * Print analysis summary
   */
  printAnalysisSummary() {
    const summary = this.analysisResults.summary;
    console.log('\n📊 Analysis Summary:');
    console.log(`   Total varieties: ${summary.totalVarieties}`);
    console.log(`   Exact matches: ${summary.exactMatches}`);
    console.log(`   Fuzzy matches: ${summary.fuzzyMatches}`);
    console.log(`   No matches: ${summary.noMatches}`);
    console.log(`   Auto-mappable: ${summary.autoMappable}`);
    console.log(`   Need review: ${summary.needsReview}`);
    console.log(`   Need manual review: ${summary.needsManualReview}`);
    console.log(`   Need new outturn: ${summary.needsNewOutturn}`);
  }

  /**
   * Print varieties needing review
   */
  printReviewVarieties(varieties) {
    console.log('\n👀 Varieties Needing Review:');
    varieties.slice(0, 10).forEach(variety => {
      console.log(`   ${variety.originalVariety} (${variety.usageCount} uses)`);
      if (variety.potentialMatches.length > 0) {
        variety.potentialMatches.slice(0, 2).forEach(match => {
          console.log(`     → ${match.standardizedVariety} (${(match.confidence * 100).toFixed(1)}%)`);
        });
      }
    });
    if (varieties.length > 10) {
      console.log(`   ... and ${varieties.length - 10} more`);
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const autoApprove = args.includes('--auto-approve');
  const batchSize = parseInt(args.find(arg => arg.startsWith('--batch-size='))?.split('=')[1]) || 100;

  const executor = new RiceStockMigrationExecutor();
  
  executor.executeMigration({ dryRun, autoApprove, batchSize })
    .then(result => {
      console.log('\n🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = RiceStockMigrationExecutor;