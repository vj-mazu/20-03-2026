const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const { Kunchinittu } = require('./Location');
const Arrival = require('./Arrival');

const BalanceAuditTrail = sequelize.define('BalanceAuditTrail', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  kunchinintuId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Kunchinittu,
      key: 'id'
    }
  },
  transactionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: Arrival,
      key: 'id'
    }
  },
  actionType: {
    type: DataTypes.ENUM('opening_balance', 'transaction', 'recalculation', 'manual_adjustment'),
    allowNull: false,
    validate: {
      isIn: [['opening_balance', 'transaction', 'recalculation', 'manual_adjustment']]
    }
  },
  previousBalance: {
    type: DataTypes.JSON,
    allowNull: true,
    validate: {
      isValidBalance(value) {
        if (value && typeof value === 'object') {
          if (!value.hasOwnProperty('bags') || !value.hasOwnProperty('netWeight')) {
            throw new Error('Balance must contain bags and netWeight properties');
          }
          if (typeof value.bags !== 'number' || typeof value.netWeight !== 'number') {
            throw new Error('Balance bags and netWeight must be numbers');
          }
        }
      }
    }
  },
  newBalance: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      isValidBalance(value) {
        if (!value || typeof value !== 'object') {
          throw new Error('New balance is required and must be an object');
        }
        if (!value.hasOwnProperty('bags') || !value.hasOwnProperty('netWeight')) {
          throw new Error('Balance must contain bags and netWeight properties');
        }
        if (typeof value.bags !== 'number' || typeof value.netWeight !== 'number') {
          throw new Error('Balance bags and netWeight must be numbers');
        }
      }
    }
  },
  balanceChange: {
    type: DataTypes.JSON,
    allowNull: true,
    validate: {
      isValidChange(value) {
        if (value && typeof value === 'object') {
          if (!value.hasOwnProperty('bags') || !value.hasOwnProperty('netWeight')) {
            throw new Error('Balance change must contain bags and netWeight properties');
          }
          if (typeof value.bags !== 'number' || typeof value.netWeight !== 'number') {
            throw new Error('Balance change bags and netWeight must be numbers');
          }
        }
      }
    }
  },
  performedBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  performedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Additional context data like date ranges, calculation parameters, etc.'
  }
}, {
  tableName: 'balance_audit_trails',
  indexes: [
    { fields: ['kunchinintuId'] },
    { fields: ['transactionId'] },
    { fields: ['actionType'] },
    { fields: ['performedBy'] },
    { fields: ['performedAt'] },
    { fields: ['kunchinintuId', 'performedAt'] },
    { fields: ['actionType', 'performedAt'] }
  ]
});

// Associations
BalanceAuditTrail.belongsTo(Kunchinittu, { 
  foreignKey: 'kunchinintuId', 
  as: 'kunchinittu' 
});

BalanceAuditTrail.belongsTo(Arrival, { 
  foreignKey: 'transactionId', 
  as: 'transaction' 
});

BalanceAuditTrail.belongsTo(User, { 
  foreignKey: 'performedBy', 
  as: 'performer' 
});

// Instance methods
BalanceAuditTrail.prototype.calculateBalanceChange = function() {
  if (this.previousBalance && this.newBalance) {
    return {
      bags: this.newBalance.bags - this.previousBalance.bags,
      netWeight: this.newBalance.netWeight - this.previousBalance.netWeight
    };
  }
  return this.newBalance; // If no previous balance, the change is the new balance
};

BalanceAuditTrail.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Calculate balance change if not already set
  if (!values.balanceChange && values.previousBalance && values.newBalance) {
    values.balanceChange = this.calculateBalanceChange();
  }
  
  return values;
};

// Class methods
BalanceAuditTrail.logBalanceChange = async function(data, transaction = null) {
  const auditData = {
    kunchinintuId: data.kunchinintuId,
    transactionId: data.transactionId || null,
    actionType: data.actionType,
    previousBalance: data.previousBalance || null,
    newBalance: data.newBalance,
    performedBy: data.performedBy,
    remarks: data.remarks || null,
    metadata: data.metadata || null
  };

  // Calculate balance change
  if (data.previousBalance && data.newBalance) {
    auditData.balanceChange = {
      bags: data.newBalance.bags - data.previousBalance.bags,
      netWeight: data.newBalance.netWeight - data.previousBalance.netWeight
    };
  } else {
    auditData.balanceChange = data.newBalance;
  }

  const options = transaction ? { transaction } : {};
  return await this.create(auditData, options);
};

BalanceAuditTrail.getAuditHistory = async function(kunchinintuId, options = {}) {
  const where = { kunchinintuId };
  
  if (options.fromDate) {
    where.performedAt = { [sequelize.Sequelize.Op.gte]: options.fromDate };
  }
  
  if (options.toDate) {
    if (where.performedAt) {
      where.performedAt[sequelize.Sequelize.Op.lte] = options.toDate;
    } else {
      where.performedAt = { [sequelize.Sequelize.Op.lte]: options.toDate };
    }
  }
  
  if (options.actionType) {
    where.actionType = options.actionType;
  }

  return await this.findAll({
    where,
    include: [
      { model: Kunchinittu, as: 'kunchinittu', attributes: ['name', 'code'] },
      { model: Arrival, as: 'transaction', attributes: ['slNo', 'date', 'movementType'] },
      { model: User, as: 'performer', attributes: ['username'] }
    ],
    order: [['performedAt', 'DESC']],
    limit: options.limit || 100
  });
};

module.exports = BalanceAuditTrail;