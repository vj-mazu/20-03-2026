const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Migration: Adding average_rate and last_rate_calculation to outturns...');
    
    try {
      // Check if average_rate column exists
      const tableDescription = await queryInterface.describeTable('outturns');
      
      if (!tableDescription.average_rate) {
        await queryInterface.addColumn('outturns', 'average_rate', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
          comment: 'Weighted average purchase rate per quintal for paddy in this outturn'
        });
        console.log('✅ Column average_rate added to outturns');
      } else {
        console.log('✅ Column average_rate already exists');
      }
      
      if (!tableDescription.last_rate_calculation) {
        await queryInterface.addColumn('outturns', 'last_rate_calculation', {
          type: DataTypes.DATE,
          allowNull: true,
          comment: 'Timestamp of last average rate calculation'
        });
        console.log('✅ Column last_rate_calculation added to outturns');
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
    console.log('🔄 Rolling back: Removing average_rate and last_rate_calculation from outturns...');
    
    try {
      await queryInterface.removeColumn('outturns', 'average_rate');
      await queryInterface.removeColumn('outturns', 'last_rate_calculation');
      console.log('✅ Rollback completed.');
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }
};
