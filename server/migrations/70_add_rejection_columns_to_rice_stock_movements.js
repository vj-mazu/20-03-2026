/**
 * Migration: Add rejection_remarks column to rice_stock_movements
 * 
 * This adds the rejection_remarks column to rice_stock_movements table
 * so rejected movements can have a reason recorded.
 */

const { sequelize } = require('../config/database');

async function up() {
    console.log('🔧 Adding rejection_remarks column to rice_stock_movements...');

    try {
        // Check if column exists
        const [columns] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rice_stock_movements' 
            AND column_name = 'rejection_remarks'
        `);

        if (columns.length === 0) {
            await sequelize.query(`
                ALTER TABLE rice_stock_movements 
                ADD COLUMN IF NOT EXISTS rejection_remarks TEXT
            `);
            console.log('✅ Added rejection_remarks column to rice_stock_movements');
        } else {
            console.log('⏩ Column rejection_remarks already exists');
        }

        // Also add rejected_by and rejected_at columns for consistency
        const [rejByCol] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rice_stock_movements' 
            AND column_name = 'rejected_by'
        `);

        if (rejByCol.length === 0) {
            await sequelize.query(`
                ALTER TABLE rice_stock_movements 
                ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id)
            `);
            console.log('✅ Added rejected_by column');
        }

        const [rejAtCol] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rice_stock_movements' 
            AND column_name = 'rejected_at'
        `);

        if (rejAtCol.length === 0) {
            await sequelize.query(`
                ALTER TABLE rice_stock_movements 
                ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE
            `);
            console.log('✅ Added rejected_at column');
        }

    } catch (error) {
        console.error('Migration error:', error);
        throw error;
    }
}

async function down() {
    console.log('🔧 Removing rejection columns from rice_stock_movements...');

    try {
        await sequelize.query(`
            ALTER TABLE rice_stock_movements 
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
