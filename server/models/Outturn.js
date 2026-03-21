const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const Outturn = sequelize.define('Outturn', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  allottedVariety: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'The variety allotted to this outturn'
  },
  type: {
    type: DataTypes.ENUM('Raw', 'Steam'),
    allowNull: false,
    defaultValue: 'Raw',
    comment: 'Processing type: Raw or Steam'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  isCleared: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_cleared',
    comment: 'Indicates if the outturn has been cleared and remaining bags added back to stock'
  },
  clearedAt: {
    type: DataTypes.DATE,
    field: 'cleared_at',
    comment: 'Timestamp when the outturn was cleared'
  },
  clearedBy: {
    type: DataTypes.INTEGER,
    field: 'cleared_by',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'User ID who cleared the outturn'
  },
  remainingBags: {
    type: DataTypes.INTEGER,
    field: 'remaining_bags',
    comment: 'Number of remaining bags added back to stock when outturn was cleared'
  },
  yieldPercentage: {
    type: DataTypes.DECIMAL(6, 2),
    field: 'yield_percentage',
    allowNull: true,
    comment: 'Yield percentage (YY) = (Total By-Products / Total Net Weight) × 100'
  },
  averageRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'average_rate',
    comment: 'Weighted average purchase rate per quintal for paddy in this outturn'
  },
  lastRateCalculation: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_rate_calculation',
    comment: 'Timestamp of last average rate calculation'
  }
}, {
  tableName: 'outturns',
  timestamps: true,
  indexes: [
    { fields: ['code'], name: 'idx_outturns_code', unique: true },
    { fields: ['allottedVariety'], name: 'idx_outturns_allotted_variety' },
    { fields: ['createdBy'], name: 'idx_outturns_created_by' },
    { fields: ['createdAt'], name: 'idx_outturns_created_at' },
    { fields: ['allottedVariety', 'createdAt'], name: 'idx_outturns_variety_date' },
    { fields: ['is_cleared'], name: 'idx_outturns_is_cleared' }
  ]
});

// Associations
Outturn.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Outturn.belongsTo(User, { foreignKey: 'clearedBy', as: 'clearer' });

module.exports = Outturn;
