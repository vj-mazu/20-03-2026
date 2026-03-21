const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Migration: Adding average_rate and last_rate_calculation to kunchinittus...');
    
    try {
      // Check if columns already exist
      const tableDescription = await queryInterface.describeTable('kunchinittus');
      
      if (!tableDescription.average_rate) {
        await queryInterface.addColumn('kunchinittus', 'average_rate', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0
        });
        console.log('✅ Column average_rate added to kunchinittus');
      } else {
        console.log('✅ Column average_rate already exists');
      }
      
      if (!tableDescription.last_rate_calculation) {
        await queryInterface.addColumn('kunchinittus', 'last_rate_calculation', {
          type: DataTypes.DATE,
          allowNull: true
        });
        console.log('✅ Column last_rate_calculation added to kunchinittus');
      } else {
        console.log('✅ Column last_rate_calculation already exists');
      }
      
      console.log('✅ Migration completed.');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Rolling back: Removing average_rate and last_rate_calculation from kunchinittus...');
    
    try {
      await queryInterface.removeColumn('kunchinittus', 'average_rate');
      await queryInterface.removeColumn('kunchinittus', 'last_rate_calculation');
      console.log('✅ Rollback completed.');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};