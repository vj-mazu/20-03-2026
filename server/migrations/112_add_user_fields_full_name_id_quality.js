const { sequelize } = require('../config/database');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('users');
      
      if (!tableInfo.full_name) {
        await queryInterface.addColumn('users', 'full_name', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added full_name column to users');
      }

      if (!tableInfo.custom_user_id) {
        await queryInterface.addColumn('users', 'custom_user_id', {
          type: Sequelize.STRING,
          allowNull: true,
          unique: true
        });
        console.log('✅ Added custom_user_id column to users');
      }
    } catch (error) {
      console.error('Migration error:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('users', 'full_name');
    await queryInterface.removeColumn('users', 'custom_user_id');
  }
};
