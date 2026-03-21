const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Remove the existing unique constraint on code
      await queryInterface.removeConstraint('kunchinittus', 'kunchinittus_code_key');
      console.log('✅ Removed unique constraint on code');
    } catch (error) {
      console.log('⚠️ Unique constraint on code may not exist:', error.message);
    }

    try {
      // Add composite unique constraint on code + warehouseId
      await queryInterface.addConstraint('kunchinittus', {
        fields: ['code', 'warehouseId'],
        type: 'unique',
        name: 'unique_code_warehouse'
      });
      console.log('✅ Added composite unique constraint on code + warehouseId');
    } catch (error) {
      console.log('⚠️ Error adding composite constraint:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove composite unique constraint
      await queryInterface.removeConstraint('kunchinittus', 'unique_code_warehouse');
      console.log('✅ Removed composite unique constraint');
    } catch (error) {
      console.log('⚠️ Error removing composite constraint:', error.message);
    }

    try {
      // Add back the original unique constraint on code
      await queryInterface.addConstraint('kunchinittus', {
        fields: ['code'],
        type: 'unique',
        name: 'kunchinittus_code_key'
      });
      console.log('✅ Restored unique constraint on code');
    } catch (error) {
      console.log('⚠️ Error restoring unique constraint:', error.message);
    }
  }
};