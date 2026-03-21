const { sequelize } = require('../config/database');

module.exports = {
  up: async () => {
    const queryInterface = sequelize.getQueryInterface();
    
    console.log('🔄 Adding yield_percentage column to outturns table...');
    
    try {
      // Check if column already exists
      const tableDescription = await queryInterface.describeTable('outturns');
      
      if (!tableDescription.yield_percentage) {
        await queryInterface.addColumn('outturns', 'yield_percentage', {
          type: sequelize.Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Yield percentage (YY) = (Total By-Products / Total Net Weight) × 100'
        });
        console.log('✅ yield_percentage column added to outturns table');
      } else {
        console.log('⚠️ yield_percentage column already exists, skipping');
      }
    } catch (error) {
      console.error('❌ Error adding yield_percentage column:', error);
      throw error;
    }
  }
};
