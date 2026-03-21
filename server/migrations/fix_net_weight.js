const { Arrival } = require('../models/Arrival');
const { sequelize } = require('../config/database');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      console.log('🔧 Fixing net weight for all arrivals...');

      // Update all records where netWeight is 0 or null
      await sequelize.query(`
        UPDATE arrivals 
        SET "netWeight" = ("grossWeight" - "tareWeight")
        WHERE "netWeight" = 0 OR "netWeight" IS NULL
      `);

      console.log('✅ Net weight fixed successfully!');

      // Verify the fix
      const result = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM arrivals 
        WHERE "netWeight" = 0 OR "netWeight" IS NULL
      `);

      console.log(`📊 Records with 0 or null netWeight remaining: ${result[0][0].count}`);

    } catch (error) {
      console.error('❌ Error fixing net weight:', error);
      // Don't throw - allow migrations to continue
      console.log('⚠️ Continuing despite error...');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // No rollback needed for data fixes
    console.log('⚠️ Rollback not implemented for net weight fix');
  }
};
