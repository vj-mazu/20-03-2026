const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Packaging = sequelize.define('Packaging', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  brandName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  allottedKg: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: 'Packaging size in KG - allows custom values'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'packagings'
});

module.exports = Packaging;
