'use strict';

/**
 * Migration: Add closed_remaining_bags column to kunchinittus table
 * Purpose: Track remaining bags when a kunchinittu is closed
 * These bags are subtracted from closing stock on the close date
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            const tableInfo = await queryInterface.describeTable('kunchinittus');

            // Add closed_remaining_bags column
            if (!tableInfo.closed_remaining_bags) {
                await queryInterface.addColumn('kunchinittus', 'closed_remaining_bags', {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    defaultValue: 0
                });
                console.log('✅ Added closed_remaining_bags column to kunchinittus');
            } else {
                console.log('⏭️ closed_remaining_bags column already exists, skipping');
            }

            console.log('✅ Migration 55 completed successfully');
        } catch (error) {
            console.log('⚠️ Migration 55 (partial success):', error.message);
        }
    },

    async down(queryInterface, Sequelize) {
        try {
            await queryInterface.removeColumn('kunchinittus', 'closed_remaining_bags');
            console.log('✅ Removed closed_remaining_bags column');
        } catch (error) {
            console.log('⚠️ Rollback (partial):', error.message);
        }
    }
};
