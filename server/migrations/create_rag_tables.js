const { sequelize } = require('../config/database');

/**
 * Migration to create RAG system tables
 * Creates: rag_configs, rag_query_logs, rag_indexing_status
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create rag_configs table
    await queryInterface.createTable('rag_configs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      api_key: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      temperature: {
        type: Sequelize.DECIMAL(3, 2),
        defaultValue: 0.7
      },
      max_tokens: {
        type: Sequelize.INTEGER,
        defaultValue: 1000
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint on user_id and provider
    await queryInterface.addConstraint('rag_configs', {
      fields: ['user_id', 'provider'],
      type: 'unique',
      name: 'rag_configs_user_provider_unique'
    });

    // Add index on user_id
    await queryInterface.addIndex('rag_configs', ['user_id'], {
      name: 'rag_configs_user_id_idx'
    });

    // Create rag_query_logs table
    await queryInterface.createTable('rag_query_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      query: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      response: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      provider: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      tokens_used: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      response_time_ms: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes on rag_query_logs
    await queryInterface.addIndex('rag_query_logs', ['user_id'], {
      name: 'rag_query_logs_user_id_idx'
    });

    await queryInterface.addIndex('rag_query_logs', ['created_at'], {
      name: 'rag_query_logs_created_at_idx'
    });

    await queryInterface.addIndex('rag_query_logs', ['user_id', 'created_at'], {
      name: 'rag_query_logs_user_created_idx'
    });

    // Create rag_indexing_status table
    await queryInterface.createTable('rag_indexing_status', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      file_path: {
        type: Sequelize.TEXT,
        allowNull: false,
        unique: true
      },
      file_type: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      last_indexed: {
        type: Sequelize.DATE,
        allowNull: true
      },
      chunk_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'pending'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes on rag_indexing_status
    await queryInterface.addIndex('rag_indexing_status', ['file_path'], {
      unique: true,
      name: 'rag_indexing_status_file_path_unique'
    });

    await queryInterface.addIndex('rag_indexing_status', ['status'], {
      name: 'rag_indexing_status_status_idx'
    });

    await queryInterface.addIndex('rag_indexing_status', ['file_type'], {
      name: 'rag_indexing_status_file_type_idx'
    });

    console.log('✅ RAG tables created successfully');
  },

  down: async (queryInterface, Sequelize) => {
    // Drop tables in reverse order
    await queryInterface.dropTable('rag_indexing_status');
    await queryInterface.dropTable('rag_query_logs');
    await queryInterface.dropTable('rag_configs');
    
    console.log('✅ RAG tables dropped successfully');
  }
};
