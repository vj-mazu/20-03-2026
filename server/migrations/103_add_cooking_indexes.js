const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add indexes for fast lookups on cooking reports specifically
        await queryInterface.addIndex('sample_entries', ['status', 'entry_date']);
        await queryInterface.addIndex('sample_entries', ['broker_name']);
        await queryInterface.addIndex('cooking_reports', ['sample_entry_id']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeIndex('sample_entries', ['status', 'entry_date']);
        await queryInterface.removeIndex('sample_entries', ['broker_name']);
        await queryInterface.removeIndex('cooking_reports', ['sample_entry_id']);
    }
};
