'use strict';

/**
 * Migration: Add source_bags column to rice_stock_movements
 * 
 * Purpose: Store original source bags separately from target bags for Palti operations
 * This enables accurate bag count display in Rice Ledger when converting between bag sizes
 * 
 * Example:
 * - Palti 50 bags (30kg) → 57 bags (26kg)
 * - source_bags = 50 (original)
 * - bags = 57 (target/calculated)
 * - Both stored separately for accurate display
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        console.log('🔄 Adding source_bags column to rice_stock_movements...');

        try {
            // Check if column already exists
            const tableInfo = await queryInterface.sequelize.query(
                `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'rice_stock_movements' AND column_name = 'source_bags'`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            if (tableInfo.length === 0) {
                await queryInterface.addColumn('rice_stock_movements', 'source_bags', {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    comment: 'Original source bags for Palti operations (before conversion)'
                });
                console.log('✅ source_bags column added successfully');
            } else {
                console.log('ℹ️ source_bags column already exists, skipping');
            }

            // Add index for performance
            await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_source_bags 
        ON rice_stock_movements(source_bags) 
        WHERE source_bags IS NOT NULL
      `);
            console.log('✅ Index created for source_bags');

        } catch (error) {
            console.error('❌ Migration error:', error.message);
            throw error;
        }
    },

    async down(queryInterface, Sequelize) {
        console.log('🔄 Removing source_bags column from rice_stock_movements...');

        try {
            await queryInterface.removeColumn('rice_stock_movements', 'source_bags');
            console.log('✅ source_bags column removed');
        } catch (error) {
            console.error('❌ Rollback error:', error.message);
            throw error;
        }
    }
};
