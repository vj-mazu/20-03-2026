/**
 * Migration 79: Create physical_inspections table
 * 
 * This table stores physical inspection data by Physical Supervisors.
 * Includes image URLs for half and full lorry photos.
 * Optimized for 10 lakh+ records with proper indexing.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🔄 Migration 79: Creating physical_inspections table...');

    await queryInterface.createTable('physical_inspections', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      lot_allotment_id: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'lot_allotments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reported_by_user_id: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      inspection_date: {
        type: sequelize.Sequelize.DATEONLY,
        allowNull: false
      },
      bags: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false
      },
      lorry_number: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: false
      },
      cutting: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      bend: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      half_lorry_image_url: {
        type: sequelize.Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to half lorry image'
      },
      full_lorry_image_url: {
        type: sequelize.Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to full lorry image'
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
    await queryInterface.addIndex('physical_inspections', ['lot_allotment_id'], {
      name: 'idx_physical_inspections_lot_allotment'
    });

    await queryInterface.addIndex('physical_inspections', ['reported_by_user_id'], {
      name: 'idx_physical_inspections_reported_by'
    });

    await queryInterface.addIndex('physical_inspections', ['inspection_date'], {
      name: 'idx_physical_inspections_date'
    });

    await queryInterface.addIndex('physical_inspections', ['lorry_number'], {
      name: 'idx_physical_inspections_lorry'
    });

    console.log('✅ Migration 79: physical_inspections table created successfully');

  } catch (error) {
    console.error('❌ Migration 79 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('🔄 Rolling back Migration 79...');
    await queryInterface.dropTable('physical_inspections');
    console.log('✅ Migration 79: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 79 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
