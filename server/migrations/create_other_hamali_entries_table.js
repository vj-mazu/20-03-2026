const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create other_hamali_entries table
    await queryInterface.createTable('other_hamali_entries', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      arrival_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'arrivals',
          key: 'id'
        }
      },
      work_type: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      work_detail: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
          isDecimal: true
        }
      },
      bags: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          isInt: true
        }
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
          isDecimal: true
        }
      },
      worker_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null
      },
      batch_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved'),
        defaultValue: 'pending',
        allowNull: false
      },
      added_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        }
      },
      approved_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('other_hamali_entries', ['arrival_id'], {
      name: 'idx_other_hamali_entries_arrival'
    });

    await queryInterface.addIndex('other_hamali_entries', ['status'], {
      name: 'idx_other_hamali_entries_status'
    });

    await queryInterface.addIndex('other_hamali_entries', ['worker_name'], {
      name: 'idx_other_hamali_entries_worker_name'
    });

    await queryInterface.addIndex('other_hamali_entries', ['added_by'], {
      name: 'idx_other_hamali_entries_added_by'
    });

    console.log('✅ Created other_hamali_entries table');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('other_hamali_entries');
  }
};