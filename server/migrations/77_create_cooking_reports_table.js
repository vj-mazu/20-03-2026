/**
 * Migration 77: Create cooking_reports table
 * 
 * This table stores cooking test evaluation results by Owner/Admin.
 * Supports Pass, Fail, Recheck, and Medium status options.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 77: Creating cooking_reports table...');
    
    // Create CookingReportStatus enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE cooking_report_status AS ENUM ('PASS', 'FAIL', 'RECHECK', 'MEDIUM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await queryInterface.createTable('cooking_reports', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      sample_entry_id: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'sample_entries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reviewed_by_user_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      status: {
        type: 'cooking_report_status',
        allowNull: false
      },
      remarks: {
        type: sequelize.Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    await queryInterface.addIndex('cooking_reports', ['sample_entry_id'], {
      name: 'idx_cooking_reports_sample_entry'
    });
    
    await queryInterface.addIndex('cooking_reports', ['status'], {
      name: 'idx_cooking_reports_status'
    });
    
    console.log('✅ Migration 77: cooking_reports table created successfully');
    
  } catch (error) {
    console.error('❌ Migration 77 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 77...');
    await queryInterface.dropTable('cooking_reports');
    await sequelize.query('DROP TYPE IF EXISTS cooking_report_status CASCADE;');
    console.log('✅ Migration 77: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 77 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
