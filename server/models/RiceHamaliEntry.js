const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const RiceProduction = require('./RiceProduction');

const RiceHamaliEntry = sequelize.define('RiceHamaliEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rice_production_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable for stock movement support
    references: {
      model: 'rice_productions',
      key: 'id'
    },
    field: 'rice_production_id'
  },
  rice_stock_movement_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Nullable for production support
    references: {
      model: 'rice_stock_movements',
      key: 'id'
    },
    field: 'rice_stock_movement_id'
  },
  entry_type: {
    type: DataTypes.ENUM('production', 'purchase', 'sale', 'palti'),
    allowNull: false,
    field: 'entry_type'
  },
  rice_hamali_rate_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'rice_hamali_rates',
      key: 'id'
    },
    field: 'rice_hamali_rate_id'
  },
  bags: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      isInt: true
    }
  },
  rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    },
    comment: 'Rate per bag at time of entry (snapshot from rice_hamali_rates)'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    },
    comment: 'Total amount at time of entry (bags * rate)'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'created_by'
  }
}, {
  tableName: 'rice_hamali_entries',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['rice_production_id'], name: 'idx_rice_hamali_entries_rice_production' },
    { fields: ['rice_stock_movement_id'], name: 'idx_rice_hamali_entries_rice_stock_movement' },
    { fields: ['rice_hamali_rate_id'], name: 'idx_rice_hamali_entries_rate' },
    { fields: ['is_active'], name: 'idx_rice_hamali_entries_active' },
    { fields: ['entry_type'], name: 'idx_rice_hamali_entries_entry_type' },
    { fields: ['created_by'], name: 'idx_rice_hamali_entries_created_by' }
  ]
});

// Associations
RiceHamaliEntry.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
RiceHamaliEntry.belongsTo(RiceProduction, { foreignKey: 'rice_production_id', as: 'riceProduction' });

// Note: RiceStockMovement and RiceHamaliRate associations will be set up when those models are loaded

module.exports = RiceHamaliEntry;