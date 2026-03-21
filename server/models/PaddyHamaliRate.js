const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaddyHamaliRate = sequelize.define('PaddyHamaliRate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  isPerLorry: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_per_lorry'
  },
  hasMultipleOptions: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_multiple_options'
  },
  parentWorkType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'parent_work_type'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'display_order'
  }
}, {
  tableName: 'paddy_hamali_rates',
  timestamps: true,
  underscored: true
});

module.exports = PaddyHamaliRate;
