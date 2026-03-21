/**
 * CookingReport Model
 * 
 * Stores cooking test evaluation results by Owner/Admin.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CookingReport = sequelize.define('CookingReport', {
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
  reviewedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reviewed_by_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('PASS', 'FAIL', 'RECHECK', 'MEDIUM'),
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recheckCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'recheck_count'
  },
  hasRemarks: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    field: 'has_remarks'
  },
  cookingDoneBy: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cooking_done_by'
  },
  cookingApprovedBy: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cooking_approved_by'
  },
  history: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'cooking_reports',
  underscored: true,
  indexes: [
    { fields: ['sample_entry_id'], unique: true },
    { fields: ['status'] }
  ]
});

CookingReport.associate = (models) => {
  CookingReport.belongsTo(models.SampleEntry, {
    foreignKey: 'sampleEntryId',
    as: 'sampleEntry'
  });

  CookingReport.belongsTo(models.User, {
    foreignKey: 'reviewedByUserId',
    as: 'reviewedBy'
  });
};

module.exports = CookingReport;
