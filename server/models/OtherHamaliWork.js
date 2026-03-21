const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OtherHamaliWork = sequelize.define('OtherHamaliWork', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  rate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  unit: {
    type: DataTypes.ENUM('per_bag', 'per_lorry', 'per_quintal', 'fixed'),
    defaultValue: 'per_bag',
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    field: 'is_active'
  }
}, {
  tableName: 'other_hamali_works',
  timestamps: true,
  underscored: true,
  indexes: [
    { fields: ['work_type'], name: 'idx_other_hamali_works_type' },
    { fields: ['is_active'], name: 'idx_other_hamali_works_active' }
  ]
});

module.exports = OtherHamaliWork;