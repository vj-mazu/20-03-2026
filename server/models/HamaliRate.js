const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HamaliRate = sequelize.define('HamaliRate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  loadingRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'loading_rate'
  },
  unloadingSadaRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'unloading_sada_rate'
  },
  unloadingKnRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'unloading_kn_rate'
  },
  looseTumbidduRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    field: 'loose_tumbiddu_rate'
  }
}, {
  tableName: 'hamali_rates',
  timestamps: true,
  underscored: true
});

module.exports = HamaliRate;
