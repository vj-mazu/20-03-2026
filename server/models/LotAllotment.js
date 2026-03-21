/**
 * LotAllotment Model
 * 
 * Tracks lot allotments from Manager to Physical Supervisors.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LotAllotment = sequelize.define('LotAllotment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  sampleEntryId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'sample_entry_id',
    references: {
      model: 'sample_entries',
      key: 'id'
    }
  },
  allottedByManagerId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'allotted_by_manager_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  allottedToSupervisorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'allotted_to_supervisor_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  allottedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'allotted_at'
  },
  allottedBags: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'allotted_bags',
    comment: 'Number of bags allotted to supervisor (partial lot)'
  },
  inspectedBags: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'inspected_bags',
    comment: 'Total bags actually inspected before closing'
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'closed_at',
    comment: 'When the lot was closed by manager'
  },
  closedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'closed_by_user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Manager who closed the lot'
  },
  closedReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'closed_reason',
    comment: 'Reason for closing (e.g. Party only sent 2000 of 4000 bags)'
  }
}, {
  tableName: 'lot_allotments',
  underscored: true,
  indexes: [
    { fields: ['sample_entry_id'], unique: true },
    { fields: ['allotted_to_supervisor_id'] },
    { fields: ['allotted_by_manager_id'] },
    { fields: ['allotted_at'] }
  ]
});

LotAllotment.associate = (models) => {
  LotAllotment.belongsTo(models.SampleEntry, {
    foreignKey: 'sampleEntryId',
    as: 'sampleEntry'
  });

  LotAllotment.belongsTo(models.User, {
    foreignKey: 'allottedByManagerId',
    as: 'manager'
  });

  LotAllotment.belongsTo(models.User, {
    foreignKey: 'allottedToSupervisorId',
    as: 'supervisor'
  });

  LotAllotment.hasOne(models.PhysicalInspection, {
    foreignKey: 'lotAllotmentId',
    as: 'physicalInspection'
  });

  // hasMany for fetching ALL inspections (multiple trips per lot)
  LotAllotment.hasMany(models.PhysicalInspection, {
    foreignKey: 'lotAllotmentId',
    as: 'physicalInspections'
  });
};

module.exports = LotAllotment;
