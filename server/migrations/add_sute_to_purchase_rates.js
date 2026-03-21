const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      const tableDescription = await queryInterface.describeTable('purchase_rates');
      
      // Add sute column if it doesn't exist
      if (!tableDescription.sute) {
        await queryInterface.addColumn('purchase_rates', 'sute', {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0
        });
        console.log('   ✅ Sute column added successfully');
      } else {
        console.log('   ℹ️ Sute column already exists, skipping...');
      }
      
      // Add sute_calculation_method column if it doesn't exist
      if (!tableDescription.sute_calculation_method) {
        await queryInterface.addColumn('purchase_rates', 'sute_calculation_method', {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: 'per_bag'
        });
        console.log('   ✅ Sute calculation method column added successfully');
        
        // Add check constraint for sute_calculation_method
        await queryInterface.sequelize.query(`
          ALTER TABLE purchase_rates
          ADD CONSTRAINT check_sute_calculation_method 
          CHECK (sute_calculation_method IN ('per_bag', 'per_quintal'))
        `);
        console.log('   ✅ Check constraint added for sute_calculation_method');
      } else {
        console.log('   ℹ️ Sute calculation method column already exists, skipping...');
      }
      
      // Create index on sute column for performance (only for non-zero values)
      try {
        await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS idx_purchase_rates_sute 
          ON purchase_rates(sute) 
          WHERE sute != 0
        `);
        console.log('   ✅ Index created on sute column');
      } catch (indexError) {
        console.log('   ℹ️ Index may already exist, skipping...');
      }
      
    } catch (error) {
      console.log('   ⚠️ Error in migration:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Drop index
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_purchase_rates_sute
      `);
      
      // Drop check constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE purchase_rates
        DROP CONSTRAINT IF EXISTS check_sute_calculation_method
      `);
      
      // Remove columns
      await queryInterface.removeColumn('purchase_rates', 'sute_calculation_method');
      await queryInterface.removeColumn('purchase_rates', 'sute');
      
      console.log('   ✅ Sute fields removed successfully');
    } catch (error) {
      console.log('   ⚠️ Error in rollback:', error.message);
      throw error;
    }
  }
};
