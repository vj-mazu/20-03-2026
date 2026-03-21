/**
 * Migration 52: Add is_direct_load column to rice_stock_locations table
 * 
 * This adds support for "Direct Load" location type - temporary single-day locations
 * for when stock is directly loaded onto lorries without going through a warehouse.
 */

const { sequelize } = require('../config/database');

async function up() {
    try {
        console.log('🔄 Migration 52: Adding is_direct_load column to rice_stock_locations...');

        // Check if column exists
        const checkResult = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'rice_stock_locations' 
            AND column_name = 'is_direct_load'
        `);

        if (checkResult[0].length === 0) {
            // Add the column
            await sequelize.query(`
                ALTER TABLE rice_stock_locations 
                ADD COLUMN is_direct_load BOOLEAN DEFAULT FALSE
            `);
            console.log('✅ Migration 52: is_direct_load column added to rice_stock_locations');
        } else {
            console.log('ℹ️ Migration 52: is_direct_load column already exists');
        }

    } catch (error) {
        console.error('❌ Migration 52 error:', error.message);
        throw error;
    }
}

module.exports = { up };
