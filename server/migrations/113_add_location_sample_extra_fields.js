const { sequelize } = require('../config/database');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableInfo = await queryInterface.describeTable('sample_entries');
      
      if (!tableInfo.smell_has) {
        await queryInterface.addColumn('sample_entries', 'smell_has', {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        });
        console.log('✅ Added smell_has column to sample_entries');
      }

      if (!tableInfo.smell_type) {
        await queryInterface.addColumn('sample_entries', 'smell_type', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added smell_type column to sample_entries');
      }

      if (!tableInfo.gps_coordinates) {
        await queryInterface.addColumn('sample_entries', 'gps_coordinates', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added gps_coordinates column to sample_entries');
      }

      if (!tableInfo.godown_image_url) {
        await queryInterface.addColumn('sample_entries', 'godown_image_url', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added godown_image_url column to sample_entries');
      }

      if (!tableInfo.paddy_lot_image_url) {
        await queryInterface.addColumn('sample_entries', 'paddy_lot_image_url', {
          type: Sequelize.STRING,
          allowNull: true
        });
        console.log('✅ Added paddy_lot_image_url column to sample_entries');
      }

    } catch (error) {
      console.error('Migration error:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('sample_entries', 'smell_has');
    await queryInterface.removeColumn('sample_entries', 'smell_type');
    await queryInterface.removeColumn('sample_entries', 'gps_coordinates');
    await queryInterface.removeColumn('sample_entries', 'godown_image_url');
    await queryInterface.removeColumn('sample_entries', 'paddy_lot_image_url');
  }
};
