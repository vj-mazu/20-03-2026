const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const HamaliEntry = sequelize.define('HamaliEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  arrivalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'arrivals',
      key: 'id'
    },
    field: 'arrival_id'
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  
  // Loading Hamali
  hasLoadingHamali: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_loading_hamali'
  },
  loadingBags: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'loading_bags'
  },
  loadingRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'loading_rate'
  },
  loadingTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'loading_total'
  },
  
  // Unloading Hamali
  hasUnloadingHamali: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_unloading_hamali'
  },
  unloadingType: {
    type: DataTypes.ENUM('sada', 'kn'),
    allowNull: true,
    field: 'unloading_type'
  },
  unloadingBags: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'unloading_bags'
  },
  unloadingRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'unloading_rate'
  },
  unloadingTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'unloading_total'
  },
  
  // Loose Tumbiddu
  hasLooseTumbiddu: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'has_loose_tumbiddu'
  },
  looseBags: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'loose_bags'
  },
  looseRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'loose_rate'
  },
  looseTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'loose_total'
  },
  
  // Total
  grandTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'grand_total'
  },
  
  // Status
  status: {
    type: DataTypes.ENUM('pending', 'approved'),
    defaultValue: 'pending',
    allowNull: false
  },
  
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'created_by'
  },
  
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'approved_by'
  },
  
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approved_at'
  }
}, {
  tableName: 'hamali_entries',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['arrival_id'], unique: true, name: 'idx_hamali_entries_arrival' },
    { fields: ['date'], name: 'idx_hamali_entries_date' },
    { fields: ['created_by'], name: 'idx_hamali_entries_created_by' }
  ]
});

// Associations
HamaliEntry.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
HamaliEntry.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

// Set up Arrival association after module is loaded to avoid circular dependency
setTimeout(() => {
  const Arrival = require('./Arrival');
  HamaliEntry.belongsTo(Arrival, { foreignKey: 'arrivalId', as: 'arrival' });
  Arrival.hasOne(HamaliEntry, { foreignKey: 'arrivalId', as: 'hamaliEntry' });
}, 0);

module.exports = HamaliEntry;
