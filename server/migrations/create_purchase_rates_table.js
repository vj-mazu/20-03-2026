const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('purchase_rates', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      arrivalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'arrivals',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'arrival_id'
      },
      baseRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'base_rate'
      },
      rateType: {
        type: DataTypes.ENUM('CDL', 'CDWB', 'MDL', 'MDWB'),
        allowNull: false,
        field: 'rate_type'
      },
      h: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      b: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      bCalculationMethod: {
        type: DataTypes.ENUM('per_bag', 'per_quintal'),
        allowNull: false,
        field: 'b_calculation_method'
      },
      lf: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      lfCalculationMethod: {
        type: DataTypes.ENUM('per_bag', 'per_quintal'),
        allowNull: false,
        field: 'lf_calculation_method'
      },
      egb: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      amountFormula: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'amount_formula'
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'total_amount'
      },
      averageRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'average_rate'
      },
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'created_by'
      },
      updatedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'updated_by'
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
    await queryInterface.addIndex('purchase_rates', ['arrival_id'], {
      unique: true,
      name: 'idx_purchase_rates_arrival'
    });
    await queryInterface.addIndex('purchase_rates', ['created_by'], {
      name: 'idx_purchase_rates_created_by'
    });
    await queryInterface.addIndex('purchase_rates', ['created_at'], {
      name: 'idx_purchase_rates_created_at'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('purchase_rates');
  }
};
