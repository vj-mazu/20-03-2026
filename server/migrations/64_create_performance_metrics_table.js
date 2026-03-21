/**
 * Migration: Create Performance Metrics Table
 * Tracks API performance for monitoring and optimization
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    // Check if table already exists
    const tables = await queryInterface.showAllTables();
    if (tables.includes('performance_metrics')) {
      console.log('✅ performance_metrics table already exists');
      return;
    }

    // Create performance_metrics table
    await queryInterface.createTable('performance_metrics', {
      id: {
        type: sequelize.Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      request_id: {
        type: sequelize.Sequelize.STRING(100),
        allowNull: false
      },
      endpoint: {
        type: sequelize.Sequelize.STRING(500),
        allowNull: false
      },
      method: {
        type: sequelize.Sequelize.STRING(10),
        allowNull: false
      },
      duration_ms: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false
      },
      query_count: {
        type: sequelize.Sequelize.INTEGER,
        defaultValue: 0
      },
      cache_hit: {
        type: sequelize.Sequelize.BOOLEAN,
        defaultValue: false
      },
      status_code: {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false
      },
      memory_mb: {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        defaultValue: 0
      },
      timestamp: {
        type: sequelize.Sequelize.DATE,
        defaultValue: sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('performance_metrics', ['endpoint', 'timestamp'], {
      name: 'idx_metrics_endpoint_timestamp'
    });

    await queryInterface.addIndex('performance_metrics', ['duration_ms'], {
      name: 'idx_metrics_duration',
      order: [['duration_ms', 'DESC']]
    });

    await queryInterface.addIndex('performance_metrics', ['timestamp'], {
      name: 'idx_metrics_timestamp'
    });

    console.log('✅ Migration 64: Performance metrics table created with indexes');
  } catch (error) {
    console.error('❌ Migration 64 failed:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropTable('performance_metrics');
}

module.exports = { up, down };
