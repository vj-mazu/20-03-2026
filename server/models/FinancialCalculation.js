/**
 * FinancialCalculation Model
 * 
 * Stores all financial calculations including Sute, Base Rate, Brokerage, EGB, LFIN, Hamali.
 * Supports custom divisor propagation for MD/Loose.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FinancialCalculation = sequelize.define('FinancialCalculation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  inventoryDataId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'inventory_data_id',
    references: {
      model: 'inventory_data',
      key: 'id'
    }
  },
  // Sute fields
  suteRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'sute_rate'
  },
  suteType: {
    type: DataTypes.ENUM('PER_BAG', 'PER_TON'),
    allowNull: false,
    field: 'sute_type'
  },
  totalSute: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'total_sute'
  },
  suteNetWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'sute_net_weight'
  },
  // Base rate fields
  baseRateType: {
    type: DataTypes.ENUM('PD_LOOSE', 'PD_WB', 'MD_WB', 'MD_LOOSE'),
    allowNull: false,
    field: 'base_rate_type'
  },
  baseRateUnit: {
    type: DataTypes.ENUM('PER_BAG', 'PER_QUINTAL'),
    allowNull: false,
    field: 'base_rate_unit'
  },
  baseRateValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'base_rate_value'
  },
  customDivisor: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'custom_divisor'
  },
  baseRateTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'base_rate_total'
  },
  // Brokerage fields
  brokerageRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'brokerage_rate'
  },
  brokerageUnit: {
    type: DataTypes.ENUM('PER_BAG', 'PER_QUINTAL'),
    allowNull: false,
    field: 'brokerage_unit'
  },
  brokerageTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'brokerage_total'
  },
  // EGB fields
  egbRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'egb_rate'
  },
  egbTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    field: 'egb_total'
  },
  // LFIN fields
  lfinRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'lfin_rate'
  },
  lfinUnit: {
    type: DataTypes.ENUM('PER_BAG', 'PER_QUINTAL'),
    allowNull: false,
    field: 'lfin_unit'
  },
  lfinTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'lfin_total'
  },
  // Hamali fields
  hamaliRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'hamali_rate'
  },
  hamaliUnit: {
    type: DataTypes.ENUM('PER_BAG', 'PER_QUINTAL'),
    allowNull: false,
    field: 'hamali_unit'
  },
  hamaliTotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: 'hamali_total'
  },
  // Check post
  checkPost: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'check_post'
  },
  // Final calculations
  totalAmount: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    field: 'total_amount'
  },
  average: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // Tracking
  ownerCalculatedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'owner_calculated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  managerCalculatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'manager_calculated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'financial_calculations',
  underscored: true,
  indexes: [
    { fields: ['inventory_data_id'], unique: true },
    { fields: ['owner_calculated_by'] },
    { fields: ['manager_calculated_by'] },
    { fields: ['base_rate_type'] },
    { fields: ['created_at'] }
  ]
});

FinancialCalculation.associate = (models) => {
  FinancialCalculation.belongsTo(models.InventoryData, {
    foreignKey: 'inventoryDataId',
    as: 'inventoryData'
  });
  
  FinancialCalculation.belongsTo(models.User, {
    foreignKey: 'ownerCalculatedBy',
    as: 'owner'
  });
  
  FinancialCalculation.belongsTo(models.User, {
    foreignKey: 'managerCalculatedBy',
    as: 'manager'
  });
};

module.exports = FinancialCalculation;
