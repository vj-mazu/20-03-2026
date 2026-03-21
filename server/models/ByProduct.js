const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Outturn = require('./Outturn');

const ByProduct = sequelize.define('ByProduct', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  outturnId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'outturns',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  rice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  rejectionRice: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  rjRice1: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'rjRice1'
  },
  rjRice2: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'rjRice2'
  },
  broken: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  rejectionBroken: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  zeroBroken: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  faram: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  bran: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  unpolished: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
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
  tableName: 'by_products',
  timestamps: true,
  underscored: false,
  indexes: [
    { fields: ['outturnId'], name: 'idx_byproducts_outturn_id' },
    { fields: ['date'], name: 'idx_byproducts_date' },
    { fields: ['createdBy'], name: 'idx_byproducts_created_by' },
    { fields: ['createdAt'], name: 'idx_byproducts_created_at' },
    { fields: ['outturnId', 'date'], name: 'idx_byproducts_outturn_date', unique: true },
    { fields: ['date', 'outturnId'], name: 'idx_byproducts_date_outturn' }
  ]
});

// Associations
ByProduct.belongsTo(Outturn, { foreignKey: 'outturnId', as: 'outturn' });
ByProduct.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

module.exports = ByProduct;
