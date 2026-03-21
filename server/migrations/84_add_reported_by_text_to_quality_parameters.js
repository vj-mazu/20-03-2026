/**
 * Migration 84: Add reported_by text field to quality_parameters table
 * 
 * Adds a text field for manually entering who reported the quality parameters
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 84: Adding reported_by text field to quality_parameters...');
    
    await queryInterface.addColumn('quality_parameters', 'reported_by', {
      type: sequelize.Sequelize.STRING(100),
      allowNull: false,
      defaultValue: '',
      comment: 'Name of person who reported the quality parameters'
    });
    
    console.log('✅ Migration 84: reported_by field added successfully');
    
  } catch (error) {
    console.error('❌ Migration 84 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 84...');
    await queryInterface.removeColumn('quality_parameters', 'reported_by');
    console.log('✅ Migration 84: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 84 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
