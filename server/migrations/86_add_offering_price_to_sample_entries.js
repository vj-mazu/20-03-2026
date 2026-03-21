/**
 * Migration: Add offering price fields to sample_entries table
 * 
 * Adds offering_price, price_type, and offering_remarks columns
 * to support the Final Report workflow stage.
 */

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    // Add offering_price column
    await queryInterface.addColumn('sample_entries', 'offering_price', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    });

    // Add price_type column
    await queryInterface.addColumn('sample_entries', 'price_type', {
      type: DataTypes.ENUM('BAGS', 'LOOSE'),
      allowNull: true
    });

    // Add offering_remarks column
    await queryInterface.addColumn('sample_entries', 'offering_remarks', {
      type: DataTypes.TEXT,
      allowNull: true
    });

    // Add final_price column
    await queryInterface.addColumn('sample_entries', 'final_price', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    });

    console.log('✓ Added offering price and final price fields to sample_entries table');
  },

  down: async (queryInterface) => {
    // Remove columns
    await queryInterface.removeColumn('sample_entries', 'final_price');
    await queryInterface.removeColumn('sample_entries', 'offering_remarks');
    await queryInterface.removeColumn('sample_entries', 'price_type');
    await queryInterface.removeColumn('sample_entries', 'offering_price');

    console.log('✓ Removed offering price and final price fields from sample_entries table');
  }
};
