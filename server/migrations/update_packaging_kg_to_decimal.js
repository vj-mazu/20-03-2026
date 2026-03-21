const { sequelize } = require('../config/database');

module.exports = {
  up: async () => {
    const queryInterface = sequelize.getQueryInterface();
    
    try {
      console.log('🔄 Converting packaging allottedKg from ENUM to DECIMAL...');
      
      // Check if column is already DECIMAL
      const tableDesc = await queryInterface.describeTable('packagings');
      const currentType = tableDesc.allottedKg?.type || '';
      
      if (currentType.includes('DECIMAL') || currentType.includes('NUMERIC')) {
        console.log('⚠️ allottedKg is already DECIMAL type, skipping migration');
        
        // Clean up temp column if it exists
        if (tableDesc.allotted_kg_temp) {
          await queryInterface.removeColumn('packagings', 'allotted_kg_temp');
          console.log('✅ Cleaned up temporary column');
        }
        
        return;
      }
      
      // Check if temp column already exists and remove it
      if (tableDesc.allotted_kg_temp) {
        console.log('⚠️ Temporary column exists, removing it first');
        await queryInterface.removeColumn('packagings', 'allotted_kg_temp');
      }
      
      // Step 1: Add a temporary column
      await queryInterface.addColumn('packagings', 'allotted_kg_temp', {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: true
      });
      console.log('✅ Added temporary column');
      
      // Step 2: Copy data from old column to new column (convert ENUM text to DECIMAL)
      await sequelize.query(`
        UPDATE packagings 
        SET allotted_kg_temp = CAST("allottedKg"::text AS DECIMAL(5,2))
      `);
      console.log('✅ Copied data to temporary column');
      
      // Step 3: Drop the old ENUM column
      await queryInterface.removeColumn('packagings', 'allottedKg');
      console.log('✅ Dropped old ENUM column');
      
      // Step 4: Rename temp column to original name
      await queryInterface.renameColumn('packagings', 'allotted_kg_temp', 'allottedKg');
      console.log('✅ Renamed temporary column');
      
      // Step 5: Make it NOT NULL
      await queryInterface.changeColumn('packagings', 'allottedKg', {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      });
      console.log('✅ Set column to NOT NULL');
      
      console.log('✅ Packaging allottedKg converted to DECIMAL successfully');
      
    } catch (error) {
      console.error('❌ Error converting packaging allottedKg:', error.message);
      
      // Try to clean up temp column if it exists
      try {
        const tableDesc = await queryInterface.describeTable('packagings');
        if (tableDesc.allotted_kg_temp) {
          await queryInterface.removeColumn('packagings', 'allotted_kg_temp');
          console.log('✅ Cleaned up temporary column after error');
        }
      } catch (cleanupError) {
        console.error('Failed to cleanup temp column:', cleanupError.message);
      }
      
      throw error;
    }
  },
  
  down: async () => {
    const queryInterface = sequelize.getQueryInterface();
    
    try {
      // Revert back to ENUM
      await queryInterface.changeColumn('packagings', 'allottedKg', {
        type: sequelize.Sequelize.ENUM('25', '26', '30'),
        allowNull: false
      });
      console.log('✅ Reverted packaging allottedKg to ENUM');
    } catch (error) {
      console.error('❌ Error reverting packaging allottedKg:', error.message);
      throw error;
    }
  }
};
