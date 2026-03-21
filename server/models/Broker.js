const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Broker = sequelize.define('Broker', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  }
}, {
  tableName: 'brokers',
  underscored: true,
  indexes: [
    { fields: ['name'] },
    { fields: ['is_active'] }
  ]
});

module.exports = Broker;
