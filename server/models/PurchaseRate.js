const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const PurchaseRate = sequelize.define('PurchaseRate', {
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
    field: 'arrival_id'
  },
  sute: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  suteCalculationMethod: {
    type: DataTypes.ENUM('per_bag', 'per_quintal'),
    allowNull: false,
    defaultValue: 'per_bag',
    field: 'sute_calculation_method'
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
  baseRateCalculationMethod: {
    type: DataTypes.ENUM('per_bag', 'per_quintal'),
    allowNull: false,
    defaultValue: 'per_bag',
    field: 'base_rate_calculation_method'
  },
  h: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  hCalculationMethod: {
    type: DataTypes.ENUM('per_bag', 'per_quintal'),
    allowNull: false,
    defaultValue: 'per_bag',
    field: 'h_calculation_method'
  },
  b: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  bCalculationMethod: {
    type: DataTypes.ENUM('per_bag', 'per_quintal'),
    allowNull: false,
    defaultValue: 'per_bag',
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
    defaultValue: 'per_bag',
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
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'pending'
  },
  adminApprovedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'admin_approved_by'
  },
  adminApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'admin_approved_at'
  }
}, {
  tableName: 'purchase_rates',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['arrival_id'], unique: true, name: 'idx_purchase_rates_arrival' },
    { fields: ['created_by'], name: 'idx_purchase_rates_created_by' },
    { fields: ['created_at'], name: 'idx_purchase_rates_created_at' }
  ]
});

// Associations
PurchaseRate.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
PurchaseRate.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
PurchaseRate.belongsTo(User, { foreignKey: 'adminApprovedBy', as: 'adminApprover' });

// Arrival association - use lazy require to avoid circular dependency
const setupArrivalAssociation = () => {
  const Arrival = require('./Arrival');
  PurchaseRate.belongsTo(Arrival, { foreignKey: 'arrivalId', as: 'arrival' });
  Arrival.hasOne(PurchaseRate, { foreignKey: 'arrivalId', as: 'purchaseRate' });
};

// Try to set up immediately, fallback to setTimeout if needed
try {
  setupArrivalAssociation();
} catch (e) {
  setTimeout(setupArrivalAssociation, 0);
}

module.exports = PurchaseRate;
