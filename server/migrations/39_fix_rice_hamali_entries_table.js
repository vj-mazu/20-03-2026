const { sequelize } = require('../config/database');

async function fixRiceHamaliEntriesTable() {
  try {
    console.log('🔄 Fixing rice_hamali_entries table structure...');

    // Drop existing table if it exists with wrong structure (COMMENTED OUT to prevent data loss)
    // await sequelize.query(`DROP TABLE IF EXISTS rice_hamali_entries CASCADE`);
    // console.log('🗑️ Dropped existing rice_hamali_entries table');

    // Create rice_hamali_entries table with correct structure (only if not exists)
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rice_hamali_entries (
        id SERIAL PRIMARY KEY,
        rice_production_id INTEGER REFERENCES rice_productions(id) ON DELETE CASCADE,
        rice_stock_movement_id INTEGER REFERENCES rice_stock_movements(id) ON DELETE CASCADE,
        entry_type VARCHAR(50) DEFAULT 'production',
        rice_hamali_rate_id INTEGER NOT NULL REFERENCES rice_hamali_rates(id) ON DELETE RESTRICT,
        bags INTEGER NOT NULL CHECK (bags > 0),
        remarks TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Created rice_hamali_entries table with correct structure');

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_rice_production 
      ON rice_hamali_entries(rice_production_id)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_rate 
      ON rice_hamali_entries(rice_hamali_rate_id)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_active 
      ON rice_hamali_entries(is_active)
    `);

    console.log('✅ Created indexes for rice_hamali_entries table');

    // Update other_hamali_entries table to support rice productions
    console.log('🔄 Updating other_hamali_entries table for rice production support...');

    // Add rice_production_id column if it doesn't exist
    await sequelize.query(`
      ALTER TABLE other_hamali_entries 
      ADD COLUMN IF NOT EXISTS rice_production_id INTEGER REFERENCES rice_productions(id) ON DELETE CASCADE
    `);

    // Add is_active column if it doesn't exist
    await sequelize.query(`
      ALTER TABLE other_hamali_entries 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true
    `);

    // Add created_by column if it doesn't exist
    await sequelize.query(`
      ALTER TABLE other_hamali_entries 
      ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE RESTRICT
    `);

    console.log('✅ Updated other_hamali_entries table for rice production support');

    // Create indexes for other_hamali_entries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_other_hamali_entries_rice_production 
      ON other_hamali_entries(rice_production_id)
    `);

    console.log('✅ Rice Hamali entries system fixed and ready');

  } catch (error) {
    console.error('❌ Error fixing rice hamali entries table:', error.message);
    throw error;
  }
}

module.exports = fixRiceHamaliEntriesTable;