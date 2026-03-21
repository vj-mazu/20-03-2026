const { sequelize } = require('../config/database');

async function createRiceHamaliEntriesTable() {
  try {
    console.log('🔄 Creating rice_hamali_entries table...');

    // First, check if table exists and drop it if it has wrong structure
    const [existingTable] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'rice_hamali_entries'
    `);

    if (existingTable.length > 0) {
      console.log('⚠️ rice_hamali_entries table exists, checking structure...');
      
      // Check if rice_production_id column exists
      const [columns] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rice_hamali_entries' 
        AND column_name = 'rice_production_id'
      `);

      if (columns.length === 0) {
        console.log('🔄 Dropping existing rice_hamali_entries table with wrong structure...');
        await sequelize.query(`DROP TABLE IF EXISTS rice_hamali_entries CASCADE`);
      } else {
        console.log('✅ rice_hamali_entries table already has correct structure');
        return;
      }
    }

    // Create rice_hamali_entries table with correct structure
    await sequelize.query(`
      CREATE TABLE rice_hamali_entries (
        id SERIAL PRIMARY KEY,
        rice_production_id INTEGER NOT NULL REFERENCES rice_productions(id) ON DELETE CASCADE,
        rice_hamali_rate_id INTEGER NOT NULL REFERENCES rice_hamali_rates(id) ON DELETE RESTRICT,
        bags INTEGER NOT NULL CHECK (bags > 0),
        remarks TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Created rice_hamali_entries table');

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

    // Add other_hamali_work_id column if it doesn't exist
    await sequelize.query(`
      ALTER TABLE other_hamali_entries 
      ADD COLUMN IF NOT EXISTS other_hamali_work_id INTEGER REFERENCES other_hamali_works(id) ON DELETE RESTRICT
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

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_other_hamali_entries_work 
      ON other_hamali_entries(other_hamali_work_id)
    `);

    console.log('✅ Rice Hamali entries system setup completed');

  } catch (error) {
    console.error('❌ Error creating rice hamali entries table:', error.message);
    throw error;
  }
}

module.exports = createRiceHamaliEntriesTable;