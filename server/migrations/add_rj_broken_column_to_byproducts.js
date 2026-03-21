/**
 * Migration: Add rjBroken column to by_products table
 * 
 * "RJ Broken" and "Rejection Broken" are SEPARATE products
 * - rejectionBroken: For "Rejection Broken" product
 * - rjBroken: For "RJ Broken" product (NEW)
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('📝 Adding rjBroken column to by_products table...');
    
    try {
      // Check if column already exists
      const tableDescription = await queryInterface.describeTable('by_products');
      
      if (!tableDescription.rjBroken) {
        // Add rjBroken column
        await queryInterface.addColumn('by_products', 'rjBroken', {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0,
          allowNull: true
        });
        
        console.log('✅ Added rjBroken column to by_products');
      } else {
        console.log('ℹ️  rjBroken column already exists');
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error in migration:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('📝 Removing rjBroken column from by_products table...');
    
    try {
      await queryInterface.removeColumn('by_products', 'rjBroken');
      console.log('✅ Removed rjBroken column');
      
      return Promise.resolve();
    } catch (error) {
      console.error('❌ Error in rollback:', error);
      throw error;
    }
  }
};
