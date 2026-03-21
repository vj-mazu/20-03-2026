const { sequelize } = require('../config/database');

/**
 * Migration 60: Rice Stock Variety Standardization
 * 
 * Features:
 * 1. Add outturn_id foreign key to rice_stock_movements table
 * 2. Create migration logging table for audit trail
 * 3. Add performance indexes for outturn variety lookups
 * 4. Preserve all existing functionality in other systems
 */

async function up() {
  console.log('🚀 Running Migration 60: Rice Stock Variety Standardization...');
  
  try {
    // 1. Add outturn_id column to rice_stock_movements table ONLY
    console.log('📊 Adding outturn_id column to rice_stock_movements...');
    
    await sequelize.query(`
      DO $$ 
      BEGIN
        -- Add outturn_id foreign key column for rice stock operations
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'outturn_id') THEN
          ALTER TABLE rice_stock_movements 
          ADD COLUMN outturn_id INTEGER REFERENCES outturns(id) ON DELETE RESTRICT;
          
          COMMENT ON COLUMN rice_stock_movements.outturn_id IS 'Foreign key to outturns table for variety standardization';
        END IF;
      END $$;
    `);
    
    console.log('✅ Added outturn_id column to rice_stock_movements');

    // 2. Create rice stock variety migration logging table
    console.log('📋 Creating rice stock variety migration logging table...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rice_stock_variety_migration_log (
        id SERIAL PRIMARY KEY,
        rice_stock_movement_id INTEGER NOT NULL REFERENCES rice_stock_movements(id) ON DELETE CASCADE,
        original_variety VARCHAR(200) NOT NULL,
        matched_outturn_id INTEGER REFERENCES outturns(id),
        created_outturn_id INTEGER REFERENCES outturns(id),
        migration_status VARCHAR(50) NOT NULL DEFAULT 'pending',
        migration_type VARCHAR(50) NOT NULL DEFAULT 'automatic',
        confidence_score DECIMAL(3,2) DEFAULT 0.0,
        migration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT check_migration_status 
        CHECK (migration_status IN ('pending', 'matched', 'created', 'failed', 'manual_review')),
        
        CONSTRAINT check_migration_type 
        CHECK (migration_type IN ('automatic', 'manual', 'fuzzy_match', 'exact_match')),
        
        CONSTRAINT check_confidence_score 
        CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0)
      );
    `);
    
    console.log('✅ Created rice_stock_variety_migration_log table');

    // 3. Add performance indexes for rice stock outturn variety lookups
    console.log('⚡ Creating performance indexes for rice stock variety operations...');
    
    await sequelize.query(`
      -- Index for rice stock movements by outturn_id
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_outturn_id
      ON rice_stock_movements(outturn_id)
      WHERE outturn_id IS NOT NULL;
      
      -- Composite index for rice stock variety lookups (outturn + location + product)
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_outturn_variety_lookup
      ON rice_stock_movements(outturn_id, location_code, product_type, status)
      WHERE outturn_id IS NOT NULL AND status = 'approved';
      
      -- Index for outturns variety and type combination (for rice stock operations)
      CREATE INDEX IF NOT EXISTS idx_outturns_variety_type_rice_stock
      ON outturns("allottedVariety", type, is_cleared);
      
      -- Index for migration logging table
      CREATE INDEX IF NOT EXISTS idx_rice_stock_migration_log_status
      ON rice_stock_variety_migration_log(migration_status, migration_date DESC);
      
      CREATE INDEX IF NOT EXISTS idx_rice_stock_migration_log_movement
      ON rice_stock_variety_migration_log(rice_stock_movement_id);
    `);
    
    console.log('✅ Created performance indexes for rice stock variety operations');

    // 4. Add constraint to prevent deletion of outturns with rice stock movements
    console.log('🔒 Adding referential integrity constraints...');
    
    await sequelize.query(`
      -- Create function to check rice stock movements before outturn deletion
      CREATE OR REPLACE FUNCTION check_outturn_rice_stock_references()
      RETURNS TRIGGER AS $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM rice_stock_movements 
          WHERE outturn_id = OLD.id
        ) THEN
          RAISE EXCEPTION 'Cannot delete outturn: it has associated rice stock movements. Please remove or reassign the rice stock movements first.';
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Create trigger to prevent outturn deletion with rice stock references
      DROP TRIGGER IF EXISTS prevent_outturn_deletion_with_rice_stock ON outturns;
      CREATE TRIGGER prevent_outturn_deletion_with_rice_stock
        BEFORE DELETE ON outturns
        FOR EACH ROW
        EXECUTE FUNCTION check_outturn_rice_stock_references();
    `);
    
    console.log('✅ Added referential integrity constraints for rice stock operations');

    // 5. Update rice_stock_balances table to also support outturn_id (for future consistency)
    console.log('📊 Updating rice_stock_balances for future outturn support...');
    
    await sequelize.query(`
      DO $$ 
      BEGIN
        -- Add outturn_id to rice_stock_balances for future consistency
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_balances' AND column_name = 'outturn_id') THEN
          ALTER TABLE rice_stock_balances 
          ADD COLUMN outturn_id INTEGER REFERENCES outturns(id) ON DELETE RESTRICT;
          
          COMMENT ON COLUMN rice_stock_balances.outturn_id IS 'Foreign key to outturns table for variety standardization (future use)';
        END IF;
      END $$;
    `);
    
    console.log('✅ Updated rice_stock_balances table');

    // 6. Create helper function for rice stock variety standardization
    await sequelize.query(`
      -- Function to get standardized variety format from outturn
      CREATE OR REPLACE FUNCTION get_standardized_variety_from_outturn(outturn_id_param INTEGER)
      RETURNS VARCHAR AS $$
      DECLARE
        result_variety VARCHAR;
      BEGIN
        SELECT UPPER(TRIM(o."allottedVariety" || ' ' || o.type))
        INTO result_variety
        FROM outturns o
        WHERE o.id = outturn_id_param;
        
        RETURN COALESCE(result_variety, 'UNKNOWN VARIETY');
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function to find outturn by variety string (for migration)
      CREATE OR REPLACE FUNCTION find_outturn_by_variety_string(variety_string VARCHAR)
      RETURNS INTEGER AS $$
      DECLARE
        outturn_id_result INTEGER;
      BEGIN
        -- Try exact match first
        SELECT o.id INTO outturn_id_result
        FROM outturns o
        WHERE UPPER(TRIM(o."allottedVariety" || ' ' || o.type)) = UPPER(TRIM(variety_string))
        ORDER BY o."createdAt" DESC
        LIMIT 1;
        
        -- If no exact match, try fuzzy match on allottedVariety only
        IF outturn_id_result IS NULL THEN
          SELECT o.id INTO outturn_id_result
          FROM outturns o
          WHERE UPPER(TRIM(o."allottedVariety")) = UPPER(TRIM(variety_string))
          ORDER BY o."createdAt" DESC
          LIMIT 1;
        END IF;
        
        RETURN outturn_id_result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Created helper functions for rice stock variety standardization');

    console.log('✅ Migration 60 completed successfully!');
    console.log('📊 Added outturn_id foreign key to rice_stock_movements');
    console.log('📋 Created migration logging table for audit trail');
    console.log('⚡ Added performance indexes for rice stock variety operations');
    console.log('🔒 Added referential integrity constraints');
    console.log('🎯 Rice stock variety standardization schema ready!');
    
  } catch (error) {
    console.error('❌ Migration 60 failed:', error);
    throw error;
  }
}

async function down() {
  console.log('⬇️ Rolling back Migration 60...');
  
  try {
    // Drop helper functions
    await sequelize.query('DROP FUNCTION IF EXISTS get_standardized_variety_from_outturn CASCADE;');
    await sequelize.query('DROP FUNCTION IF EXISTS find_outturn_by_variety_string CASCADE;');
    
    // Drop trigger and function
    await sequelize.query('DROP TRIGGER IF EXISTS prevent_outturn_deletion_with_rice_stock ON outturns;');
    await sequelize.query('DROP FUNCTION IF EXISTS check_outturn_rice_stock_references CASCADE;');
    
    // Drop indexes
    await sequelize.query(`
      DROP INDEX IF EXISTS idx_rice_stock_movements_outturn_id;
      DROP INDEX IF EXISTS idx_rice_stock_movements_outturn_variety_lookup;
      DROP INDEX IF EXISTS idx_outturns_variety_type_rice_stock;
      DROP INDEX IF EXISTS idx_rice_stock_migration_log_status;
      DROP INDEX IF EXISTS idx_rice_stock_migration_log_movement;
    `);
    
    // Drop migration log table
    await sequelize.query('DROP TABLE IF EXISTS rice_stock_variety_migration_log CASCADE;');
    
    // Remove columns
    await sequelize.query(`
      ALTER TABLE rice_stock_movements DROP COLUMN IF EXISTS outturn_id;
      ALTER TABLE rice_stock_balances DROP COLUMN IF EXISTS outturn_id;
    `);
    
    console.log('✅ Migration 60 rollback completed');
    
  } catch (error) {
    console.error('❌ Migration 60 rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };