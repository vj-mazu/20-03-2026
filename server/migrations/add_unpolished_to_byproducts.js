const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    // Add unpolished column to by_products table
    await queryInterface.addColumn('by_products', 'unpolished', {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      allowNull: true
    });
    
    console.log('✓ Added unpolished column to by_products table');
  },

  down: async (queryInterface) => {
    // Remove unpolished column
    await queryInterface.removeColumn('by_products', 'unpolished');
    
    console.log('✓ Removed unpolished column from by_products table');
  }
};
