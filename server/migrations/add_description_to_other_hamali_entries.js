const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add description column to other_hamali_entries table
      await queryInterface.addColumn('other_hamali_entries', 'description', {
        type: DataTypes.TEXT,
        allowNull: true,
        after: 'work_detail'
      });

      console.log('✅ Added description column to other_hamali_entries table');
    } catch (error) {
      console.error('❌ Error adding description column:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeColumn('other_hamali_entries', 'description');
      console.log('✅ Removed description column from other_hamali_entries table');
    } catch (error) {
      console.error('❌ Error removing description column:', error);
      throw error;
    }
  }
};