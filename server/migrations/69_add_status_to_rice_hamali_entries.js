const { sequelize } = require('../config/database');

async function addStatusToRiceHamaliEntries() {
    try {
        console.log('🔄 Migration 69: Adding status column to rice_hamali_entries...');

        // Check if table exists
        const [tableExists] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'rice_hamali_entries'
    `);

        if (tableExists.length === 0) {
            console.log('⚠️ rice_hamali_entries table does not exist, skipping migration');
            return;
        }

        // Check if status column already exists
        const [columnExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rice_hamali_entries' 
      AND column_name = 'status'
    `);

        if (columnExists.length > 0) {
            console.log('✅ status column already exists in rice_hamali_entries');
            return;
        }

        // Add status column
        await sequelize.query(`
      ALTER TABLE rice_hamali_entries 
      ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'approved'
    `);
        console.log('✅ Added status column to rice_hamali_entries');

        // Add approved_by column
        const [approvedByExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rice_hamali_entries' 
      AND column_name = 'approved_by'
    `);

        if (approvedByExists.length === 0) {
            await sequelize.query(`
        ALTER TABLE rice_hamali_entries 
        ADD COLUMN approved_by INTEGER REFERENCES users(id)
      `);
            console.log('✅ Added approved_by column to rice_hamali_entries');
        }

        // Add approved_at column
        const [approvedAtExists] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'rice_hamali_entries' 
      AND column_name = 'approved_at'
    `);

        if (approvedAtExists.length === 0) {
            await sequelize.query(`
        ALTER TABLE rice_hamali_entries 
        ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE
      `);
            console.log('✅ Added approved_at column to rice_hamali_entries');
        }

        // Create index on status for faster pending queries
        await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_status 
      ON rice_hamali_entries(status)
    `);
        console.log('✅ Created index on status column');

        console.log('✅ Migration 69 completed: rice_hamali_entries status columns added');
    } catch (error) {
        console.error('❌ Migration 69 error:', error.message);
        throw error;
    }
}

module.exports = addStatusToRiceHamaliEntries;
