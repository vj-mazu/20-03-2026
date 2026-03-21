'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Check if the column already exists to be safe
        const tableInfo = await queryInterface.describeTable('cooking_reports');
        if (!tableInfo.history) {
            await queryInterface.addColumn('cooking_reports', 'history', {
                type: Sequelize.JSON,
                allowNull: true,
                defaultValue: [],
                comment: 'Stores the history of review passes (date, status, cookingDoneBy, approvedBy)'
            });
        }
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('cooking_reports', 'history');
    }
};
