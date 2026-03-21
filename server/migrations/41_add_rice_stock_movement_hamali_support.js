const { sequelize } = require('../config/database');

async function addRiceStockMovementHamaliSupport() {
  console.log('🔄 Migration 41: Adding Rice Stock Movement Hamali Support...');
  
  try {
    // Add new columns to rice_hamali_entries table
    await sequelize.query(`
      ALTER TABLE rice_hamali_entries 
      ADD COLUMN IF NOT EXISTS rice_stock_movement_id INTEGER,
      ADD COLUMN IF NOT EXISTS entry_type VARCHAR(20) DEFAULT 'production'
    `);
    
    console.log('✅ Added rice_stock_movement_id and entry_type columns');
    
    // Update existing entries to have entry_type = 'production'
    await sequelize.query(`
      UPDATE rice_hamali_entries 
      SET entry_type = 'production' 
      WHERE entry_type IS NULL OR entry_type = ''
    `);
    
    console.log('✅ Updated existing entries with entry_type = production');
    
    // Make rice_production_id nullable since we now support stock movements too
    await sequelize.query(`
      ALTER TABLE rice_hamali_entries 
      ALTER COLUMN rice_production_id DROP NOT NULL
    `);
    
    console.log('✅ Made rice_production_id nullable');
    
    // Add check constraint to ensure either rice_production_id or rice_stock_movement_id is set
    await sequelize.query(`
      ALTER TABLE rice_hamali_entries 
      ADD CONSTRAINT check_hamali_reference 
      CHECK (
        (entry_type = 'production' AND rice_production_id IS NOT NULL AND rice_stock_movement_id IS NULL) OR
        (entry_type = 'purchase' AND rice_stock_movement_id IS NOT NULL AND rice_production_id IS NULL) OR
        (entry_type = 'sale' AND rice_stock_movement_id IS NOT NULL AND rice_production_id IS NULL)
      )
    `);
    
    console.log('✅ Added check constraint for hamali reference integrity');
    
    console.log('✅ Migration 41: Rice Stock Movement Hamali Support completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration 41 failed:', error.message);
    throw error;
  }
}

module.exports = addRiceStockMovementHamaliSupport;