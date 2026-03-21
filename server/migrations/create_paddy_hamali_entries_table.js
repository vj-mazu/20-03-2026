const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('paddy_hamali_entries', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      arrivalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'arrivals',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'arrival_id'
      },
      workType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'work_type'
      },
      workDetail: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'work_detail'
      },
      rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      bags: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved'),
        defaultValue: 'pending',
        allowNull: false
      },
      addedBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'added_by'
      },
      approvedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'approved_by'
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'approved_at'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    // Create indexes
    await queryInterface.addIndex('paddy_hamali_entries', ['arrival_id'], {
      name: 'idx_paddy_hamali_entries_arrival'
    });
    await queryInterface.addIndex('paddy_hamali_entries', ['status'], {
      name: 'idx_paddy_hamali_entries_status'
    });
    await queryInterface.addIndex('paddy_hamali_entries', ['added_by'], {
      name: 'idx_paddy_hamali_entries_added_by'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('paddy_hamali_entries');
  }
};
