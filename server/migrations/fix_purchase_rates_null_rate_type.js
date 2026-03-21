const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, update any NULL rate_type values to a default value (CDL)
      await queryInterface.sequelize.query(`
        UPDATE purchase_rates 
        SET rate_type = 'CDL' 
        WHERE rate_type IS NULL;
      `);
      
      console.log('✅ Updated NULL rate_type values to CDL');
    } catch (error) {
      console.log('⚠️ Could not update NULL rate_type values:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No rollback needed - we're just fixing data
  }
};
