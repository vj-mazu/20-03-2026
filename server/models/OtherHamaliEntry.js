const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const OtherHamaliEntry = sequelize.define('OtherHamaliEntry', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  arrivalId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'arrivals',
      key: 'id'
    },
    field: 'arrival_id'
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
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  bags: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      isInt: true
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  workerName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'worker_name'
  },
  batchNumber: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'batch_number'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved'),
    defaultValue: 'pending',
    allowNull: false
  },
  addedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'added_by'
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
  tableName: 'other_hamali_entries',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['arrival_id'], name: 'idx_other_hamali_entries_arrival' },
    { fields: ['status'], name: 'idx_other_hamali_entries_status' },
    { fields: ['worker_name'], name: 'idx_other_hamali_entries_worker_name' },
    { fields: ['added_by'], name: 'idx_other_hamali_entries_added_by' }
  ]
});

// Associations
OtherHamaliEntry.belongsTo(User, { foreignKey: 'addedBy', as: 'addedByUser' });
OtherHamaliEntry.belongsTo(User, { foreignKey: 'approvedBy', as: 'approvedByUser' });

// Set up Arrival association - will be properly initialized in associations setup
// This is handled in the route files where both models are imported

module.exports = OtherHamaliEntry;