const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const RiceStockLocation = sequelize.define('RiceStockLocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: 'Location code like A1, A2, B8, etc.'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Optional description of the location'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isDirectLoad: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_direct_load',
    comment: 'True if this is a Direct Load location - stock does not carry over to next day'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'rice_stock_locations',
  timestamps: true,
  indexes: [
    { fields: ['code'], name: 'idx_rice_stock_locations_code', unique: true },
    { fields: ['isActive'], name: 'idx_rice_stock_locations_active' }
  ]
});

// Associations
RiceStockLocation.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = RiceStockLocation;
