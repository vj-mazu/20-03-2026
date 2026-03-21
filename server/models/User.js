const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'manager', 'staff', 'paddy_supervisor', 'inventory_staff', 'financial_account'),
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  staffType: {
    type: DataTypes.ENUM('mill', 'location'),
    allowNull: true
  },
  fullName: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'full_name'
  },
  customUserId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    field: 'custom_user_id'
  },
  qualityName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: null,
    comment: 'Quality name for quality_supervisor role'
  }
}, {
  tableName: 'users',
  indexes: [
    { fields: ['username'] },
    { fields: ['role'] }
  ]
});

module.exports = User;
