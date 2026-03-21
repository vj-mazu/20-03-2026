const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RiceHamaliRate = sequelize.define('RiceHamaliRate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  work_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'work_type'
  },
  work_detail: {
    type: DataTypes.STRING(200),
    allowNull: false,
    field: 'work_detail'
  },
  rate_18_21: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    },
    field: 'rate_18_21'
  },
  rate_21_24: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    },
    field: 'rate_21_24'
  },
  rate_24_27: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    },
    field: 'rate_24_27'
  },
  rate_27_30: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0,
      isDecimal: true
    },
    field: 'rate_27_30'
  },
  rate_30_plus: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    validate: {
      min: 0,
      isDecimal: true
    },
    field: 'rate_30_plus'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  display_order: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'display_order'
  }
}, {
  tableName: 'rice_hamali_rates',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['work_type'], name: 'idx_rice_hamali_rates_work_type' },
    { fields: ['is_active'], name: 'idx_rice_hamali_rates_active' },
    { fields: ['display_order'], name: 'idx_rice_hamali_rates_display_order' },
    { fields: ['work_type', 'work_detail'], name: 'idx_rice_hamali_rates_work_type_detail' }
  ]
});

module.exports = RiceHamaliRate;