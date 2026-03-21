const { sequelize } = require('../config/database');

/**
 * Migration 42: Add Rice Stock Approval System and Palti (Brand Conversion) Feature
 * 
 * Features:
 * 1. Add approval system for Purchase/Sale movements
 * 2. Add Palti (brand conversion) movement type with shortage tracking
 * 3. Ultra performance indexes for 3+ lakh records
 * 4. Shortage tracking table for Palti operations
 */

async function up() {
  console.log('🚀 Running Migration 42: Rice Stock Approval System + Palti Feature...');
  
  try {
    // 1. Add approval columns to rice_stock_movements if not exists
    await sequelize.query(`
      DO $$ 
      BEGIN
        -- Add approval_status column (pending, approved, rejected)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'approval_status') THEN
          ALTER TABLE rice_stock_movements ADD COLUMN approval_status VARCHAR(20) DEFAULT 'pending';
        END IF;
        
        -- Add approved_by column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'approved_by') THEN
          ALTER TABLE rice_stock_movements ADD COLUMN approved_by INTEGER REFERENCES users(id);
        END IF;
        
        -- Add approved_at column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'approved_at') THEN
          ALTER TABLE rice_stock_movements ADD COLUMN approved_at TIMESTAMP;
        END IF;
        
        -- Add rejection_reason column
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'rejection_reason') THEN
          ALTER TABLE rice_stock_movements ADD COLUMN rejection_reason TEXT;
        END IF;
        
        -- Add palti-specific columns
        -- source_packaging_id for Palti operations
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'source_packaging_id') THEN
          ALTER TABLE rice_stock_movements ADD COLUMN source_packaging_id INTEGER REFERENCES packagings(id);
        END IF;
        
        -- target_packaging_id for Palti operations
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'target_packaging_id') THEN
          ALTER TABLE rice_stock_movements ADD COLUMN target_packaging_id INTEGER REFERENCES packagings(id);
        END IF;
        
        -- conversion_shortage_kg for Palti shortage tracking
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'conversion_shortage_kg') THEN
          ALTER TABLE rice_stock_movements ADD COLUMN conversion_shortage_kg DECIMAL(10,3) DEFAULT 0;
        END IF;
        
        -- conversion_shortage_bags for Palti shortage tracking
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'rice_stock_movements' AND column_name = 'conversion_shortage_bags') THEN
          ALTER TABLE rice_stock_movements ADD COLUMN conversion_shortage_bags DECIMAL(10,3) DEFAULT 0;
        END IF;
        
      END $$;
    `);
    
    // 1.5. Update movement_type constraint to include palti
    await sequelize.query(`
      -- Drop existing constraint if it exists
      ALTER TABLE rice_stock_movements 
      DROP CONSTRAINT IF EXISTS rice_stock_movements_movement_type_check;
      
      -- Add new constraint with palti
      ALTER TABLE rice_stock_movements 
      ADD CONSTRAINT rice_stock_movements_movement_type_check 
      CHECK (movement_type IN ('purchase', 'sale', 'palti'));
    `);
    
    // 2. Create rice_stock_shortages table for detailed shortage tracking
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rice_stock_shortages (
        id SERIAL PRIMARY KEY,
        rice_stock_movement_id INTEGER NOT NULL REFERENCES rice_stock_movements(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        product_type VARCHAR(100) NOT NULL,
        variety VARCHAR(200) NOT NULL,
        location_code VARCHAR(50) NOT NULL,
        source_packaging_id INTEGER NOT NULL REFERENCES packagings(id),
        target_packaging_id INTEGER NOT NULL REFERENCES packagings(id),
        source_bags INTEGER NOT NULL,
        source_total_kg DECIMAL(10,3) NOT NULL,
        target_bags INTEGER NOT NULL,
        target_total_kg DECIMAL(10,3) NOT NULL,
        shortage_kg DECIMAL(10,3) NOT NULL,
        shortage_bags DECIMAL(10,3) NOT NULL,
        shortage_percentage DECIMAL(5,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 3. ULTRA PERFORMANCE INDEXES for 3+ lakh records
    console.log('📊 Creating ultra performance indexes...');
    
    // Core performance indexes
    await sequelize.query(`
      -- Primary performance index: date + movement_type + approval_status
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_performance_core
      ON rice_stock_movements (date DESC, movement_type, approval_status, location_code);
      
      -- Approval workflow index
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_approval_workflow
      ON rice_stock_movements (approval_status, created_at DESC) 
      WHERE approval_status IN ('pending', 'approved');
      
      -- Stock calculation index (variety + location + packaging)
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_stock_calculation
      ON rice_stock_movements (product_type, variety, location_code, packaging_id, approval_status)
      WHERE approval_status = 'approved';
      
      -- Palti operations index
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_palti_operations
      ON rice_stock_movements (movement_type, source_packaging_id, target_packaging_id, date DESC)
      WHERE movement_type = 'palti';
      
      -- User activity index (created_by + approved_by)
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_user_activity
      ON rice_stock_movements (created_by, approved_by, created_at DESC);
      
      -- Month-wise pagination index (year + month)
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_monthly_pagination
      ON rice_stock_movements (EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), id DESC);
      
      -- Shortage tracking indexes
      CREATE INDEX IF NOT EXISTS idx_rice_stock_shortages_performance
      ON rice_stock_shortages (date DESC, location_code, product_type, variety);
      
      CREATE INDEX IF NOT EXISTS idx_rice_stock_shortages_movement_lookup
      ON rice_stock_shortages (rice_stock_movement_id);
    `);
    
    // 4. Update existing movements to have approval status
    await sequelize.query(`
      -- Set existing movements as approved (backward compatibility)
      UPDATE rice_stock_movements 
      SET approval_status = 'approved', 
          approved_at = created_at
      WHERE approval_status IS NULL OR approval_status = 'pending';
    `);
    
    // 5. Create optimized view for stock calculations
    await sequelize.query(`
      CREATE OR REPLACE VIEW rice_stock_summary AS
      SELECT 
        product_type,
        variety,
        location_code,
        packaging_id,
        SUM(CASE 
          WHEN movement_type IN ('production', 'purchase') THEN bags 
          WHEN movement_type = 'sale' THEN -bags
          WHEN movement_type = 'palti' THEN 0  -- Palti is conversion, net effect handled separately
          ELSE 0 
        END) as net_bags,
        SUM(CASE 
          WHEN movement_type IN ('production', 'purchase') THEN quantity_quintals 
          WHEN movement_type = 'sale' THEN -quantity_quintals
          WHEN movement_type = 'palti' THEN 0
          ELSE 0 
        END) as net_quintals,
        COUNT(*) as total_movements,
        MAX(date) as last_movement_date
      FROM rice_stock_movements 
      WHERE approval_status = 'approved'
      GROUP BY product_type, variety, location_code, packaging_id;
    `);
    
    // 6. Create function for Palti shortage calculation
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_palti_shortage(
        source_bags INTEGER,
        source_kg_per_bag DECIMAL,
        target_kg_per_bag DECIMAL
      ) RETURNS TABLE(
        target_bags INTEGER,
        shortage_kg DECIMAL,
        shortage_bags DECIMAL,
        shortage_percentage DECIMAL
      ) AS $$
      DECLARE
        total_kg DECIMAL;
        calculated_target_bags DECIMAL;
        actual_target_bags INTEGER;
        shortage_kg_result DECIMAL;
        shortage_bags_result DECIMAL;
        shortage_percentage_result DECIMAL;
      BEGIN
        -- Calculate total weight
        total_kg := source_bags * source_kg_per_bag;
        
        -- Calculate theoretical target bags (with decimals)
        calculated_target_bags := total_kg / target_kg_per_bag;
        
        -- Get actual target bags (floor value)
        actual_target_bags := FLOOR(calculated_target_bags);
        
        -- Calculate shortage
        shortage_kg_result := total_kg - (actual_target_bags * target_kg_per_bag);
        shortage_bags_result := shortage_kg_result / target_kg_per_bag;
        shortage_percentage_result := (shortage_kg_result / total_kg) * 100;
        
        RETURN QUERY SELECT 
          actual_target_bags,
          shortage_kg_result,
          shortage_bags_result,
          shortage_percentage_result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log('✅ Migration 42 completed successfully!');
    console.log('📊 Added approval system for Purchase/Sale movements');
    console.log('🔄 Added Palti (brand conversion) system with shortage tracking');
    console.log('⚡ Created ultra performance indexes for 3+ lakh records');
    
  } catch (error) {
    console.error('❌ Migration 42 failed:', error);
    throw error;
  }
}

async function down() {
  console.log('⬇️ Rolling back Migration 42...');
  
  try {
    // Drop function
    await sequelize.query('DROP FUNCTION IF EXISTS calculate_palti_shortage CASCADE;');
    
    // Drop view
    await sequelize.query('DROP VIEW IF EXISTS rice_stock_summary CASCADE;');
    
    // Drop table
    await sequelize.query('DROP TABLE IF EXISTS rice_stock_shortages CASCADE;');
    
    // Drop indexes
    await sequelize.query(`
      DROP INDEX IF EXISTS idx_rice_stock_movements_performance_core;
      DROP INDEX IF EXISTS idx_rice_stock_movements_approval_workflow;
      DROP INDEX IF EXISTS idx_rice_stock_movements_stock_calculation;
      DROP INDEX IF EXISTS idx_rice_stock_movements_palti_operations;
      DROP INDEX IF EXISTS idx_rice_stock_movements_user_activity;
      DROP INDEX IF EXISTS idx_rice_stock_movements_monthly_pagination;
      DROP INDEX IF EXISTS idx_rice_stock_shortages_performance;
      DROP INDEX IF EXISTS idx_rice_stock_shortages_movement_lookup;
    `);
    
    // Remove columns
    await sequelize.query(`
      ALTER TABLE rice_stock_movements 
      DROP COLUMN IF EXISTS approval_status,
      DROP COLUMN IF EXISTS approved_by,
      DROP COLUMN IF EXISTS approved_at,
      DROP COLUMN IF EXISTS rejection_reason,
      DROP COLUMN IF EXISTS source_packaging_id,
      DROP COLUMN IF EXISTS target_packaging_id,
      DROP COLUMN IF EXISTS conversion_shortage_kg,
      DROP COLUMN IF EXISTS conversion_shortage_bags;
    `);
    
    console.log('✅ Migration 42 rollback completed');
    
  } catch (error) {
    console.error('❌ Migration 42 rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };