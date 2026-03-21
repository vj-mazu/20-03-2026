/**
 * Migration 76: Create quality_parameters table
 * 
 * This table stores quality parameters added by Quality Supervisors.
 * Contains all quality measurement fields for rice sample evaluation.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Migration 76: Creating quality_parameters table...');
    
    await queryInterface.createTable('quality_parameters', {
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
      moisture: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      cutting_1: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      cutting_2: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      bend: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      mix_s: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      mix_l: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      mix: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      kandu: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      oil: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      sk: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      grains_count: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false
      },
      wb_r: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      wb_bk: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      wb_t: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      paddy_wb: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      phoo: {
        type: sequelize.Sequelize.DECIMAL(5, 2),
        allowNull: false
      },
      upload_file_url: {
        type: sequelize.Sequelize.STRING(500),
        allowNull: true,
        comment: 'URL to uploaded quality documentation file'
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
    
    // Create index for fast lookup by sample_entry_id
    await queryInterface.addIndex('quality_parameters', ['sample_entry_id'], {
      name: 'idx_quality_parameters_sample_entry'
    });
    
    await queryInterface.addIndex('quality_parameters', ['reported_by_user_id'], {
      name: 'idx_quality_parameters_reported_by'
    });
    
    console.log('✅ Migration 76: quality_parameters table created successfully');
    
  } catch (error) {
    console.error('❌ Migration 76 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    console.log('🔄 Rolling back Migration 76...');
    await queryInterface.dropTable('quality_parameters');
    console.log('✅ Migration 76: Rolled back successfully');
  } catch (error) {
    console.error('❌ Migration 76 rollback error:', error.message);
    throw error;
  }
}

module.exports = { up, down };
