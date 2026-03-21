const { sequelize } = require('../config/database');

async function fixRiceHamaliConstraint() {
  console.log('🔄 Migration 42: Fixing Rice Hamali Constraint...');
  
  try {
    // Drop the existing constraint
    await sequelize.query(`
      ALTER TABLE rice_hamali_entries 
      DROP CONSTRAINT IF EXISTS check_hamali_reference
    `);
    
    console.log('✅ Dropped old constraint');
    
    // Add new constraint that includes palti
    await sequelize.query(`
      ALTER TABLE rice_hamali_entries 
      ADD CONSTRAINT check_hamali_reference 
      CHECK (
        (entry_type = 'production' AND rice_production_id IS NOT NULL AND rice_stock_movement_id IS NULL) OR
        (entry_type = 'purchase' AND rice_stock_movement_id IS NOT NULL AND rice_production_id IS NULL) OR
        (entry_type = 'sale' AND rice_stock_movement_id IS NOT NULL AND rice_production_id IS NULL) OR
        (entry_type = 'palti' AND rice_stock_movement_id IS NOT NULL AND rice_production_id IS NULL)
      )
    `);
    
    console.log('✅ Added new constraint with palti support');
    console.log('✅ Migration 42: Rice Hamali Constraint fixed successfully!');
    
  } catch (error) {
    console.error('❌ Migration 42 failed:', error.message);
    throw error;
  }
}

module.exports = fixRiceHamaliConstraint;