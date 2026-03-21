/**
 * Migration 78: Create lot_allotments table
 * 
 * This table tracks lot allotments from Manager to Physical Supervisors.
 * Includes unique constraint to prevent duplicate allotments.
 * Optimized for 10 lakh+ records with proper indexing.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 78: Creating lot_allotments table...');
    
    await queryInterface.createTable('lot_allotments', {
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
        onDelete: 'CASCADE',
        comment: 'Unique constraint prevents duplicate allotment'
      },
      allotted_by_manager_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      allotted_to_supervisor_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      allotted_at: {
        type: sequelize.Sequelize.DATE,
        allowNull: false,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
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
    
    // Performance indexes for 10 lakh+ records
    await queryInterface.addIndex('lot_allotments', ['sample_entry_id'], {
      name: 'idx_lot_allotments_sample_entry',
      unique: true
    });
    
    await queryInterface.addIndex('lot_allotments', ['allotted_to_supervisor_id'], {
      name: 'idx_lot_allotments_supervisor'
    });
    
    await queryInterface.addIndex('lot_allotments', ['allotted_by_manager_id'], {
      name: 'idx_lot_allotments_manager'
    });
    
    await queryInterface.addIndex('lot_allotments', ['allotted_at'], {
      name: 'idx_lot_allotments_date'
    });
    
    console.log('✅ Migration 78: lot_allotments table created successfully');
    
  } catch (error) {
    console.error('❌ Migration 78 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 78...');
    await queryInterface.dropTable('lot_allotments');
    console.log('✅ Migration 78: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 78 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
