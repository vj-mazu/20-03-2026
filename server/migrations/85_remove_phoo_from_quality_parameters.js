/**
 * Migration 85: Remove phoo column from quality_parameters table
 * 
 * Removes the phoo field as it's no longer needed
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 85: Removing phoo column from quality_parameters...');
    
    await queryInterface.removeColumn('quality_parameters', 'phoo');
    
    console.log('✅ Migration 85: phoo column removed successfully');
    
  } catch (error) {
    console.error('❌ Migration 85 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 85...');
    await queryInterface.addColumn('quality_parameters', 'phoo', {
      type: sequelize.Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0
    });
    console.log('✅ Migration 85: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 85 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
