/**
 * Migration 80: Create inventory_data table
 * 
 * This table stores inventory weight measurements and location data.
 * Includes auto-calculated net weight field.
 * Optimized for 10 lakh+ records with proper indexing.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 80: Creating inventory_data table...');
    
    // Create InventoryLocation enum
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE inventory_location AS ENUM (
          'DIRECT_KUNCHINITTU',
          'WAREHOUSE',
          'DIRECT_OUTTURN_PRODUCTION'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await queryInterface.createTable('inventory_data', {
      id: {
        type: sequelize.Sequelize.UUID,
        defaultValue: sequelize.Sequelize.UUIDV4,
        primaryKey: true
      },
      physical_inspection_id: {
        type: sequelize.Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: 'physical_inspections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recorded_by_user_id: {
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
      variety: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      bags: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false
      },
      moisture: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      wb_number: {
        type: sequelize.Sequelize.STRING(50),
        allowNull: false
      },
      gross_weight: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      tare_weight: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      net_weight: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Auto-calculated: gross_weight - tare_weight'
      },
      location: {
        type: 'inventory_location',
        allowNull: false
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
    await queryInterface.addIndex('inventory_data', ['physical_inspection_id'], {
      name: 'idx_inventory_data_physical_inspection',
      unique: true
    });
    
    await queryInterface.addIndex('inventory_data', ['recorded_by_user_id'], {
      name: 'idx_inventory_data_recorded_by'
    });
    
    await queryInterface.addIndex('inventory_data', ['entry_date'], {
      name: 'idx_inventory_data_date'
    });
    
    await queryInterface.addIndex('inventory_data', ['variety'], {
      name: 'idx_inventory_data_variety'
    });
    
    await queryInterface.addIndex('inventory_data', ['wb_number'], {
      name: 'idx_inventory_data_wb_number'
    });
    
    await queryInterface.addIndex('inventory_data', ['location'], {
      name: 'idx_inventory_data_location'
    });
    
    console.log('✅ Migration 80: inventory_data table created successfully');
    
  } catch (error) {
    console.error('❌ Migration 80 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 80...');
    await queryInterface.dropTable('inventory_data');
    await sequelize.query('DROP TYPE IF EXISTS inventory_location CASCADE;');
    console.log('✅ Migration 80: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 80 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
