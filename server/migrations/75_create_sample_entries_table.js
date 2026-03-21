/**
 * Migration 75: Create sample_entries table
 * 
 * This table stores initial sample entries created by Staff users.
 * Supports two entry types: Create New and Direct Loaded Vehicle.
 * Tracks workflow status through the entire sample-to-purchase lifecycle.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 75: Creating sample_entries table...');
    
    // Create EntryType enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE entry_type AS ENUM ('CREATE_NEW', 'DIRECT_LOADED_VEHICLE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create WorkflowStatus enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE workflow_status AS ENUM (
          'STAFF_ENTRY',
          'QUALITY_CHECK',
          'LOT_SELECTION',
          'COOKING_REPORT',
          'FINAL_REPORT',
          'LOT_ALLOTMENT',
          'PHYSICAL_INSPECTION',
          'INVENTORY_ENTRY',
          'OWNER_FINANCIAL',
          'MANAGER_FINANCIAL',
          'FINAL_REVIEW',
          'COMPLETED',
          'FAILED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create sample_entries table
    await queryInterface.createTable('sample_entries', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      created_by_user_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      entry_date: {
        type: sequelize.Sequelize.DATEONLY,
        allowNull: false
      },
      broker_name: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      variety: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      party_name: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      location: {
        type: sequelize.Sequelize.STRING(200),
        allowNull: false
      },
      sample_collected: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      bags: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false
      },
      lorry_number: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: true,
        comment: 'Only for Direct Loaded Vehicle entries'
      },
      entry_type: {
        type: 'entry_type',
        allowNull: false
      },
      workflow_status: {
        type: 'workflow_status',
        allowNull: false,
        defaultValue: 'STAFF_ENTRY'
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
    
    // Create indexes for performance
    await queryInterface.addIndex('sample_entries', ['workflow_status'], {
      name: 'idx_sample_entries_workflow_status'
    });
    
    await queryInterface.addIndex('sample_entries', ['created_by_user_id'], {
      name: 'idx_sample_entries_created_by'
    });
    
    await queryInterface.addIndex('sample_entries', ['entry_date'], {
      name: 'idx_sample_entries_entry_date'
    });
    
    await queryInterface.addIndex('sample_entries', ['broker_name'], {
      name: 'idx_sample_entries_broker_name'
    });
    
    await queryInterface.addIndex('sample_entries', ['variety'], {
      name: 'idx_sample_entries_variety'
    });
    
    console.log('✅ Migration 75: sample_entries table created successfully');
    
  } catch (error) {
    console.error('❌ Migration 75 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 75...');
    
    await queryInterface.dropTable('sample_entries');
    await sequelize.query('DROP TYPE IF EXISTS entry_type CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS workflow_status CASCADE;');
    
    console.log('✅ Migration 75: Rolled back successfully');
    
  } catch (error) {
    console.error('❌ Migration 75 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
