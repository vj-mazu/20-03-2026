'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('sample_entry_offerings');

        if (!tableInfo.sute_enabled) {
            await queryInterface.addColumn('sample_entry_offerings', 'sute_enabled', {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                defaultValue: true
            });
        }

        if (!tableInfo.moisture_enabled) {
            await queryInterface.addColumn('sample_entry_offerings', 'moisture_enabled', {
                type: Sequelize.BOOLEAN,
                allowNull: true,
                defaultValue: true
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('sample_entry_offerings', 'sute_enabled');
        await queryInterface.removeColumn('sample_entry_offerings', 'moisture_enabled');
    }
};
