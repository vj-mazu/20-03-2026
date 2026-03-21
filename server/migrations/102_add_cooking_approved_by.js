const { DataTypes } = require('sequelize');

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // Add cooking_approved_by column
        await queryInterface.addColumn('cooking_reports', 'cooking_approved_by', {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'The person who approved the report (usually an Admin/Manager)'
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('cooking_reports', 'cooking_approved_by');
    }
};
