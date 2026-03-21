/**
 * Migration: Add rejection_remarks column to hamali entries tables
 * 
 * This adds the rejection_remarks column to paddy_hamali_entries and rice_hamali_entries tables
 * so rejected entries can have a reason recorded.
 */

const { sequelize } = require('../config/database');

async function up() {
    console.log('🔧 Adding rejection_remarks columns to hamali entries tables...');

    try {
        // Add to paddy_hamali_entries
        const [paddyCol] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'paddy_hamali_entries' 
            AND column_name = 'rejection_remarks'
        `);

        if (paddyCol.length === 0) {
            await sequelize.query(`
                ALTER TABLE paddy_hamali_entries 
                ADD COLUMN IF NOT EXISTS rejection_remarks TEXT
            `);
            console.log('✅ Added rejection_remarks column to paddy_hamali_entries');
        } else {
            console.log('⏩ Column rejection_remarks already exists in paddy_hamali_entries');
        }

        // Add rejected_by and rejected_at to paddy_hamali_entries
        const [paddyRejBy] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'paddy_hamali_entries' 
            AND column_name = 'rejected_by'
        `);

        if (paddyRejBy.length === 0) {
            await sequelize.query(`
                ALTER TABLE paddy_hamali_entries 
                ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id)
            `);
            console.log('✅ Added rejected_by column to paddy_hamali_entries');
        }

        const [paddyRejAt] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'paddy_hamali_entries' 
            AND column_name = 'rejected_at'
        `);

        if (paddyRejAt.length === 0) {
            await sequelize.query(`
                ALTER TABLE paddy_hamali_entries 
                ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE
            `);
            console.log('✅ Added rejected_at column to paddy_hamali_entries');
        }

        // Add to rice_hamali_entries
        const [riceCol] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rice_hamali_entries' 
            AND column_name = 'rejection_remarks'
        `);

        if (riceCol.length === 0) {
            await sequelize.query(`
                ALTER TABLE rice_hamali_entries 
                ADD COLUMN IF NOT EXISTS rejection_remarks TEXT
            `);
            console.log('✅ Added rejection_remarks column to rice_hamali_entries');
        } else {
            console.log('⏩ Column rejection_remarks already exists in rice_hamali_entries');
        }

        // Add rejected_by and rejected_at to rice_hamali_entries
        const [riceRejBy] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rice_hamali_entries' 
            AND column_name = 'rejected_by'
        `);

        if (riceRejBy.length === 0) {
            await sequelize.query(`
                ALTER TABLE rice_hamali_entries 
                ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id)
            `);
            console.log('✅ Added rejected_by column to rice_hamali_entries');
        }

        const [riceRejAt] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rice_hamali_entries' 
            AND column_name = 'rejected_at'
        `);

        if (riceRejAt.length === 0) {
            await sequelize.query(`
                ALTER TABLE rice_hamali_entries 
                ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE
            `);
            console.log('✅ Added rejected_at column to rice_hamali_entries');
        }

    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    }
}

async function down() {
    console.log('🔧 Removing rejection columns from hamali entries tables...');

    try {
        await sequelize.query(`
            ALTER TABLE paddy_hamali_entries 
            DROP COLUMN IF EXISTS rejection_remarks,
            DROP COLUMN IF EXISTS rejected_by,
            DROP COLUMN IF EXISTS rejected_at
        `);
        await sequelize.query(`
            ALTER TABLE rice_hamali_entries 
            DROP COLUMN IF EXISTS rejection_remarks,
            DROP COLUMN IF EXISTS rejected_by,
            DROP COLUMN IF EXISTS rejected_at
        `);
        console.log('✅ Removed rejection columns');
    } catch (error) {
        console.error('Rollback error:', error);
    }
}

module.exports = { up, down };
