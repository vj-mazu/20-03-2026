const { DataTypes } = require('sequelize');

module.exports = async function up() {
    const { sequelize } = require('../config/database');
    const queryInterface = sequelize.getQueryInterface();

    try {
        console.log('🔄 Migration: Adding base_rate_calculation_method to purchase_rates...');

        // Check if column already exists
        const tableDescription = await queryInterface.describeTable('purchase_rates');
        
        if (tableDescription.base_rate_calculation_method) {
            console.log('✅ Column base_rate_calculation_method already exists');
            return;
        }

        // Add the column
        await queryInterface.addColumn('purchase_rates', 'base_rate_calculation_method', {
            type: DataTypes.ENUM('per_bag', 'per_quintal'),
            allowNull: false,
            defaultValue: 'per_bag',
            after: 'rate_type'
        });

        console.log('✅ Column base_rate_calculation_method added successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};
