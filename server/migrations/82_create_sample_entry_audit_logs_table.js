/**
 * Migration 82: Create sample_entry_audit_logs table
 * 
 * This table stores audit trail for all sample entry workflow actions.
 * Uses JSONB for flexible old/new value storage.
 * Optimized for 10 lakh+ records with proper indexing and partitioning strategy.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 82: Creating sample_entry_audit_logs table...');
    
    // Create ActionType enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE audit_action_type AS ENUM (
          'CREATE',
          'UPDATE',
          'DELETE',
          'WORKFLOW_TRANSITION',
          'APPROVAL',
          'REJECTION'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await queryInterface.createTable('sample_entry_audit_logs', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      user_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      record_id: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        comment: 'ID of the record being audited'
      },
      table_name: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false,
        comment: 'Name of the table being audited'
      },
      action_type: {
        type: 'audit_action_type',
        allowNull: false
      },
      old_values: {
        type: sequelize.Sequelize.JSONB,
        allowNull: true,
        comment: 'Previous values before change'
      },
      new_values: {
        type: sequelize.Sequelize.JSONB,
        allowNull: true,
        comment: 'New values after change'
      },
      metadata: {
        type: sequelize.Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional context (IP address, user agent, etc.)'
      },
      created_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Performance indexes for 10 lakh+ records
    await queryInterface.addIndex('sample_entry_audit_logs', ['user_id'], {
      name: 'idx_audit_logs_user'
    });
    
    await queryInterface.addIndex('sample_entry_audit_logs', ['record_id'], {
      name: 'idx_audit_logs_record'
    });
    
    await queryInterface.addIndex('sample_entry_audit_logs', ['table_name'], {
      name: 'idx_audit_logs_table'
    });
    
    await queryInterface.addIndex('sample_entry_audit_logs', ['action_type'], {
      name: 'idx_audit_logs_action'
    });
    
    await queryInterface.addIndex('sample_entry_audit_logs', ['created_at'], {
      name: 'idx_audit_logs_created_at'
    });
    
    // Composite index for common queries
    await queryInterface.addIndex('sample_entry_audit_logs', ['table_name', 'record_id', 'created_at'], {
      name: 'idx_audit_logs_table_record_date'
    });
    
    // GIN index for JSONB columns for fast JSON queries
    await sequelize.query(`
      CREATE INDEX idx_audit_logs_old_values_gin ON sample_entry_audit_logs USING GIN (old_values);
    `);
    
    await sequelize.query(`
      CREATE INDEX idx_audit_logs_new_values_gin ON sample_entry_audit_logs USING GIN (new_values);
    `);
    
    console.log('✅ Migration 82: sample_entry_audit_logs table created successfully');
    
  } catch (error) {
    console.error('❌ Migration 82 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 82...');
    await queryInterface.dropTable('sample_entry_audit_logs');
    await sequelize.query('DROP TYPE IF EXISTS audit_action_type CASCADE;');
    console.log('✅ Migration 82: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 82 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
