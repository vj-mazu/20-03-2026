const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const { Warehouse, Kunchinittu, Variety } = require('./Location');

// Outturn will be required later to avoid circular dependency

const Arrival = sequelize.define('Arrival', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  slNo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  movementType: {
    type: DataTypes.ENUM('purchase', 'shifting', 'production-shifting', 'for-production', 'loose'),
    allowNull: false
  },

  // Purchase fields
  broker: {
    type: DataTypes.STRING(100),
    allowNull: true // Only for purchase
  },
  variety: {
    type: DataTypes.STRING(100),
    allowNull: true // Changed to text field for user input
  },
  bags: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fromLocation: {
    type: DataTypes.STRING(100),
    allowNull: true // User-entered text for purchase
  },

  // Purchase destination (chain-linked)
  toKunchinintuId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Kunchinittu,
      key: 'id'
    }
  },
  toWarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },

  // Shifting fields
  fromKunchinintuId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Kunchinittu,
      key: 'id'
    }
  },
  fromWarehouseId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },
  toWarehouseShiftId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },

  // Production shifting field
  outturnId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'outturns',
      key: 'id'
    }
  },

  // Purchase from outturn field (for direct production to kunchinittu)
  fromOutturnId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'outturns',
      key: 'id'
    }
  },

  // Linked production shifting ID (for tracking which production shifting this stock came from)
  linkedShiftingId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'arrivals',
      key: 'id'
    }
  },

  // Common fields
  moisture: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  cutting: {
    type: DataTypes.STRING(20),
    allowNull: true // Format: "3x2"
  },
  wbNo: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  grossWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tareWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  netWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  lorryNumber: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  // snapshotRate: {
  //   type: DataTypes.DECIMAL(10, 2),
  //   allowNull: true,
  //   field: 'snapshot_rate',
  //   comment: 'Snapshot of kunchinittu average rate at time of production-shifting entry'
  // },

  // System fields
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'deleted', 'admin-approved'),
    defaultValue: 'pending'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  adminApprovedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  adminApprovedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deletedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: User,
      key: 'id'
    }
  },
  deletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'arrivals',
  indexes: [
    // Single column indexes for basic queries
    { fields: ['slNo'], name: 'idx_arrivals_slno' },
    { fields: ['date'], name: 'idx_arrivals_date' },
    { fields: ['movementType'], name: 'idx_arrivals_movement_type' },
    { fields: ['status'], name: 'idx_arrivals_status' },
    { fields: ['variety'], name: 'idx_arrivals_variety' },
    { fields: ['broker'], name: 'idx_arrivals_broker' },
    { fields: ['wbNo'], name: 'idx_arrivals_wb_no' },
    { fields: ['lorryNumber'], name: 'idx_arrivals_lorry_number' },
    { fields: ['createdBy'], name: 'idx_arrivals_created_by' },
    { fields: ['approvedBy'], name: 'idx_arrivals_approved_by' },
    { fields: ['adminApprovedBy'], name: 'idx_arrivals_admin_approved_by' },
    { fields: ['outturnId'], name: 'idx_arrivals_outturn_id' },
    { fields: ['linkedShiftingId'], name: 'idx_arrivals_linked_shifting_id' },
    { fields: ['createdAt'], name: 'idx_arrivals_created_at' },

    // Foreign key indexes for joins
    { fields: ['toKunchinintuId'], name: 'idx_arrivals_to_kunchinittu' },
    { fields: ['toWarehouseId'], name: 'idx_arrivals_to_warehouse' },
    { fields: ['fromKunchinintuId'], name: 'idx_arrivals_from_kunchinittu' },
    { fields: ['fromWarehouseId'], name: 'idx_arrivals_from_warehouse' },
    { fields: ['toWarehouseShiftId'], name: 'idx_arrivals_to_warehouse_shift' },

    // Composite indexes for common query patterns
    { fields: ['date', 'movementType'], name: 'idx_arrivals_date_movement' },
    { fields: ['date', 'status'], name: 'idx_arrivals_date_status' },
    { fields: ['status', 'movementType'], name: 'idx_arrivals_status_movement' },
    { fields: ['status', 'date'], name: 'idx_arrivals_status_date' },
    { fields: ['movementType', 'date'], name: 'idx_arrivals_movement_date' },

    // Paddy stock queries (approved + admin approved)
    { fields: ['status', 'adminApprovedBy'], name: 'idx_arrivals_status_admin' },
    { fields: ['status', 'adminApprovedBy', 'date'], name: 'idx_arrivals_stock_query' },

    // Production shifting queries
    { fields: ['movementType', 'outturnId'], name: 'idx_arrivals_movement_outturn' },
    { fields: ['movementType', 'outturnId', 'date'], name: 'idx_arrivals_production_query' },

    // Kunchinittu ledger queries
    { fields: ['toKunchinintuId', 'status', 'date'], name: 'idx_arrivals_to_kunchinittu_ledger' },
    { fields: ['fromKunchinintuId', 'status', 'date'], name: 'idx_arrivals_from_kunchinittu_ledger' },
    { fields: ['toKunchinintuId', 'movementType', 'status'], name: 'idx_arrivals_to_kunchinittu_type' },
    { fields: ['fromKunchinintuId', 'movementType', 'status'], name: 'idx_arrivals_from_kunchinittu_type' },

    // Variety-based queries
    { fields: ['variety', 'date'], name: 'idx_arrivals_variety_date' },
    { fields: ['variety', 'movementType'], name: 'idx_arrivals_variety_movement' },

    // User activity queries
    { fields: ['createdBy', 'date'], name: 'idx_arrivals_created_by_date' },
    { fields: ['createdBy', 'status'], name: 'idx_arrivals_created_by_status' }
  ]
});

// Associations
Arrival.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Arrival.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });
Arrival.belongsTo(User, { foreignKey: 'adminApprovedBy', as: 'adminApprover' });
// variety is now a text field, not a foreign key

// Purchase destination (chain-linked)
Arrival.belongsTo(Kunchinittu, { foreignKey: 'toKunchinintuId', as: 'toKunchinittu' });
Arrival.belongsTo(Warehouse, { foreignKey: 'toWarehouseId', as: 'toWarehouse' });

// Shifting locations
Arrival.belongsTo(Warehouse, { foreignKey: 'fromWarehouseId', as: 'fromWarehouse' });
Arrival.belongsTo(Warehouse, { foreignKey: 'toWarehouseShiftId', as: 'toWarehouseShift' });
Arrival.belongsTo(Kunchinittu, { foreignKey: 'fromKunchinintuId', as: 'fromKunchinittu' });

// Production shifting link (self-referencing)
Arrival.belongsTo(Arrival, { foreignKey: 'linkedShiftingId', as: 'linkedShifting' });
Arrival.hasMany(Arrival, { foreignKey: 'linkedShiftingId', as: 'derivedArrivals' });

// Set up Outturn association after module is loaded
setTimeout(() => {
  const Outturn = require('./Outturn');
  Arrival.belongsTo(Outturn, { foreignKey: 'outturnId', as: 'outturn' });
  Arrival.belongsTo(Outturn, { foreignKey: 'fromOutturnId', as: 'fromOutturn' });
}, 0);

module.exports = Arrival;