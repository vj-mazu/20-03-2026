const { DataTypes } = require('sequelize');

module.exports = async function up() {
    const { sequelize } = require('../config/database');
    const queryInterface = sequelize.getQueryInterface();

    try {
        console.log('🔄 Migration: Adding h_calculation_method to purchase_rates...');

        // Check if column already exists
        const tableDescription = await queryInterface.describeTable('purchase_rates');

        if (tableDescription.h_calculation_method) {
            console.log('✅ Column h_calculation_method already exists');
            return;
        }

        // Add the column
        await queryInterface.addColumn('purchase_rates', 'h_calculation_method', {
            type: DataTypes.ENUM('per_bag', 'per_quintal'),
            allowNull: false,
            defaultValue: 'per_bag',
            after: 'h'
        });

        console.log('✅ Column h_calculation_method added successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};
