'use strict';

const { sequelize } = require('../config/database');

module.exports = {
    async up() {
        const queryInterface = sequelize.getQueryInterface();

        // Check if columns already exist before adding
        const tableDescription = await queryInterface.describeTable('inventory_data');

        if (!tableDescription.kunchinittu_id) {
            await queryInterface.addColumn('inventory_data', 'kunchinittu_id', {
                type: require('sequelize').DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'kunchinittus',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
            console.log('✅ Added kunchinittu_id column to inventory_data');
        } else {
            console.log('⏭️ kunchinittu_id column already exists');
        }

        if (!tableDescription.outturn_id) {
            await queryInterface.addColumn('inventory_data', 'outturn_id', {
                type: require('sequelize').DataTypes.INTEGER,
                allowNull: true,
                references: {
                    model: 'outturns',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            });
            console.log('✅ Added outturn_id column to inventory_data');
        } else {
            console.log('⏭️ outturn_id column already exists');
        }

        // Add indexes
        try {
            await queryInterface.addIndex('inventory_data', ['kunchinittu_id'], {
                name: 'idx_inventory_data_kunchinittu'
            });
            console.log('✅ Added index on kunchinittu_id');
        } catch (e) {
            console.log('⏭️ Index on kunchinittu_id already exists');
        }

        try {
            await queryInterface.addIndex('inventory_data', ['outturn_id'], {
                name: 'idx_inventory_data_outturn'
            });
            console.log('✅ Added index on outturn_id');
        } catch (e) {
            console.log('⏭️ Index on outturn_id already exists');
        }
    },

    async down() {
        const queryInterface = sequelize.getQueryInterface();

        try {
            await queryInterface.removeIndex('inventory_data', 'idx_inventory_data_kunchinittu');
            await queryInterface.removeIndex('inventory_data', 'idx_inventory_data_outturn');
        } catch (e) {
            // Indexes may not exist
        }

        await queryInterface.removeColumn('inventory_data', 'kunchinittu_id');
        await queryInterface.removeColumn('inventory_data', 'outturn_id');
    }
};
