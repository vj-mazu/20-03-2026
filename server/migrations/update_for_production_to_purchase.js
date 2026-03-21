const { sequelize } = require('../config/database');

/**
 * Migration to update for-production records to purchase
 * Changes movementType from 'for-production' to 'purchase'
 */
module.exports = {
  up: async () => {
    try {
      // Update all for-production records to purchase
      await sequelize.query(`
        UPDATE arrivals 
        SET "movementType" = 'purchase'
        WHERE "movementType" = 'for-production';
      `);
      
      console.log('✅ Updated for-production records to purchase');
      
      // Get count of updated records
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM arrivals 
        WHERE "movementType" = 'purchase' AND "outturnId" IS NOT NULL;
      `);
      
      console.log(`✅ Total purchase records with outturn: ${results[0].count}`);
    } catch (error) {
      console.error('❌ Error updating for-production records:', error.message);
      throw error;
    }
  },

  down: async () => {
    // Rollback: Change purchase records with outturnId back to for-production
    try {
      await sequelize.query(`
        UPDATE arrivals 
        SET "movementType" = 'for-production'
        WHERE "movementType" = 'purchase' 
        AND "outturnId" IS NOT NULL 
        AND "toKunchinintuId" IS NULL;
      `);
      
      console.log('✅ Rolled back purchase records to for-production');
    } catch (error) {
      console.error('❌ Error rolling back:', error.message);
      throw error;
    }
  }
};
