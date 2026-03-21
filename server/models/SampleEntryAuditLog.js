/**
 * SampleEntryAuditLog Model
 * 
 * Stores audit trail for all sample entry workflow actions.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SampleEntryAuditLog = sequelize.define('SampleEntryAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  recordId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'record_id'
  },
  tableName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'table_name'
  },
  actionType: {
    type: DataTypes.ENUM('CREATE', 'UPDATE', 'DELETE', 'WORKFLOW_TRANSITION', 'APPROVAL', 'REJECTION'),
    allowNull: false,
    field: 'action_type'
  },
  oldValues: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'old_values'
  },
  newValues: {
    type: DataTypes.JSONB,
    allowNull: true,
    field: 'new_values'
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: 'sample_entry_audit_logs',
  underscored: true,
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['record_id'] },
    { fields: ['table_name'] },
    { fields: ['action_type'] },
    { fields: ['created_at'] },
    { fields: ['table_name', 'record_id', 'created_at'] }
  ]
});

SampleEntryAuditLog.associate = (models) => {
  SampleEntryAuditLog.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

// Prevent updates and deletes
SampleEntryAuditLog.beforeUpdate(() => {
  throw new Error('Audit logs cannot be updated');
});

SampleEntryAuditLog.beforeDestroy(() => {
  throw new Error('Audit logs cannot be deleted');
});

module.exports = SampleEntryAuditLog;
