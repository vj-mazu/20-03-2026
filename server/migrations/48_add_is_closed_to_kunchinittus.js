/**
 * Migration: Add isClosed field to Kunchinittu
 * 
 * Purpose: Allow closing a Kunchinittu when inward = outward + loose
 * Closed Kunchinittus won't appear in dropdown selections
 */
const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface) => {
        console.log('🔄 Adding isClosed column to kunchinittus table...');

        try {
            // Check if column already exists
            const tableInfo = await queryInterface.describeTable('kunchinittus');

            if (!tableInfo.is_closed) {
                await queryInterface.addColumn('kunchinittus', 'is_closed', {
                    type: DataTypes.BOOLEAN,
                    allowNull: false,
                    defaultValue: false
                });
                console.log('✅ Added is_closed column to kunchinittus');
            } else {
                console.log('⏭️ is_closed column already exists, skipping');
            }

            if (!tableInfo.closed_at) {
                await queryInterface.addColumn('kunchinittus', 'closed_at', {
                    type: DataTypes.DATE,
                    allowNull: true
                });
                console.log('✅ Added closed_at column to kunchinittus');
            } else {
                console.log('⏭️ closed_at column already exists, skipping');
            }

            if (!tableInfo.closed_by) {
                await queryInterface.addColumn('kunchinittus', 'closed_by', {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                });
                console.log('✅ Added closed_by column to kunchinittus');
            } else {
                console.log('⏭️ closed_by column already exists, skipping');
            }

            // Add index for faster lookups of open kunchinittus
            try {
                await queryInterface.addIndex('kunchinittus', ['is_closed'], {
                    name: 'idx_kunchinittus_is_closed'
                });
                console.log('✅ Added index on is_closed');
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log('⏭️ Index already exists, skipping');
                } else {
                    console.warn('⚠️ Failed to add index:', e.message);
                }
            }

            console.log('✅ Migration completed successfully');
        } catch (error) {
            console.error('❌ Migration error:', error);
            throw error;
        }
    },

    down: async (queryInterface) => {
        console.log('🔄 Removing isClosed columns from kunchinittus table...');

        try {
            await queryInterface.removeIndex('kunchinittus', 'idx_kunchinittus_is_closed');
        } catch (e) {
            console.warn('⚠️ Could not remove index:', e.message);
        }

        try {
            await queryInterface.removeColumn('kunchinittus', 'closed_by');
            await queryInterface.removeColumn('kunchinittus', 'closed_at');
            await queryInterface.removeColumn('kunchinittus', 'is_closed');
            console.log('✅ Removed isClosed columns');
        } catch (e) {
            console.warn('⚠️ Could not remove columns:', e.message);
        }
    }
};
