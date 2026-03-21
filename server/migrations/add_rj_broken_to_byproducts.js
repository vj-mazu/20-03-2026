/**
 * Migration: Add RJ Broken support to by_products
 * 
 * RJ Broken and Rejection Broken are the same product type.
 * We'll use the existing 'rejectionBroken' column for both.
 * 
 * This migration adds a comment to document the alias.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('📝 Adding RJ Broken support to by_products table...');
    
    try {
      // Add a comment to the rejectionBroken column to document the alias
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN by_products."rejectionBroken" IS 
        'Rejection Broken / RJ Broken (both names refer to the same product type)';
      `);
      
      console.log('✅ Added column comment for RJ Broken alias');
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('📝 Removing RJ Broken comment from by_products table...');
    
    try {
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN by_products."rejectionBroken" IS NULL;
      `);
      
      console.log('✅ Removed column comment');
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error in rollback:', error);
      throw error;
    }
  }
};
