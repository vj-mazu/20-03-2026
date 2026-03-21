/**
 * Migration 81: Create financial_calculations table
 * 
 * This table stores all financial calculations including:
 * - Sute, Base Rate, Brokerage, EGB, LFIN, Hamali
 * - Custom divisor propagation for MD/Loose
 * - Total Amount and Average calculations
 * Optimized for 10 lakh+ records with proper indexing.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 81: Creating financial_calculations table...');
    
    // Create enums for financial calculations
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE sute_type AS ENUM ('PER_BAG', 'PER_TON');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE base_rate_type AS ENUM ('PD_LOOSE', 'PD_WB', 'MD_WB', 'MD_LOOSE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE calculation_unit AS ENUM ('PER_BAG', 'PER_QUINTAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await queryInterface.createTable('financial_calculations', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      inventory_data_id: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'inventory_data',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Sute calculation fields
      sute_rate: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      sute_type: {
        type: 'sute_type',
        allowNull: false
      },
      total_sute: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      sute_net_weight: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Used for all Base Rate calculations'
      },
      // Base rate calculation fields
      base_rate_type: {
        type: 'base_rate_type',
        allowNull: false
      },
      base_rate_unit: {
        type: 'calculation_unit',
        allowNull: false
      },
      base_rate_value: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      custom_divisor: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'For MD/Loose - propagates to Brokerage, LFIN, Hamali'
      },
      base_rate_total: {
        type: sequelize.Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      // Brokerage calculation fields
      brokerage_rate: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      brokerage_unit: {
        type: 'calculation_unit',
        allowNull: false
      },
      brokerage_total: {
        type: sequelize.Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      // EGB calculation fields
      egb_rate: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Only for PD/Loose and MD/Loose'
      },
      egb_total: {
        type: sequelize.Sequelize.DECIMAL(12, 2),
        allowNull: true
      },
      // LFIN calculation fields
      lfin_rate: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      lfin_unit: {
        type: 'calculation_unit',
        allowNull: false
      },
      lfin_total: {
        type: sequelize.Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      // Hamali calculation fields
      hamali_rate: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      hamali_unit: {
        type: 'calculation_unit',
        allowNull: false
      },
      hamali_total: {
        type: sequelize.Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      // Check post
      check_post: {
        type: sequelize.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Affects Patti format'
      },
      // Final calculations
      total_amount: {
        type: sequelize.Sequelize.DECIMAL(14, 2),
        allowNull: false,
        comment: 'Sum of all calculations'
      },
      average: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total Amount ÷ Sute Net Weight'
      },
      // Tracking fields
      owner_calculated_by: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      manager_calculated_by: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
    await queryInterface.addIndex('financial_calculations', ['inventory_data_id'], {
      name: 'idx_financial_calculations_inventory',
      unique: true
    });
    
    await queryInterface.addIndex('financial_calculations', ['owner_calculated_by'], {
      name: 'idx_financial_calculations_owner'
    });
    
    await queryInterface.addIndex('financial_calculations', ['manager_calculated_by'], {
      name: 'idx_financial_calculations_manager'
    });
    
    await queryInterface.addIndex('financial_calculations', ['base_rate_type'], {
      name: 'idx_financial_calculations_base_rate_type'
    });
    
    await queryInterface.addIndex('financial_calculations', ['created_at'], {
      name: 'idx_financial_calculations_created_at'
    });
    
    console.log('✅ Migration 81: financial_calculations table created successfully');
    
  } catch (error) {
    console.error('❌ Migration 81 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 81...');
    await queryInterface.dropTable('financial_calculations');
    await sequelize.query('DROP TYPE IF EXISTS sute_type CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS base_rate_type CASCADE;');
    await sequelize.query('DROP TYPE IF EXISTS calculation_unit CASCADE;');
    console.log('✅ Migration 81: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 81 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
