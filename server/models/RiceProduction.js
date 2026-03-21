const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Outturn = require('./Outturn');
const Packaging = require('./Packaging');

const RiceProduction = sequelize.define('RiceProduction', {
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
  productType: {
    type: DataTypes.ENUM('Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Sizer Broken', 'Rejection Broken', 'RJ Broken', 'Broken', 'Zero Broken', 'Faram', 'Unpolished', 'RJ Rice 1', 'RJ Rice 2'),
    allowNull: false
  },
  quantityQuintals: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Quantity in quintals'
  },
  packagingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'packagings',
      key: 'id'
    }
  },
  bags: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Auto-calculated based on quantity and packaging kg'
  },
  paddyBagsDeducted: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: 'Number of paddy bags deducted (quintals × 3, rounded)'
  },
  movementType: {
    type: DataTypes.ENUM('kunchinittu', 'loading'),
    allowNull: false
  },
  // For kunchinittu movement
  locationCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // For loading movement
  lorryNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved'),
    defaultValue: 'pending'
  },
  approvedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'rice_productions'
});

// Associations
RiceProduction.belongsTo(Outturn, { foreignKey: 'outturnId', as: 'outturn' });
RiceProduction.belongsTo(Packaging, { foreignKey: 'packagingId', as: 'packaging' });
RiceProduction.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
RiceProduction.belongsTo(User, { foreignKey: 'approvedBy', as: 'approver' });

module.exports = RiceProduction;
