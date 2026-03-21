const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const { Kunchinittu } = require('./Location');

const OpeningBalance = sequelize.define('OpeningBalance', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true,
      notEmpty: true
    }
  },
  openingBags: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      isInt: true
    }
  },
  openingNetWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: {
      min: 0,
      isDecimal: true
    }
  },
  isManual: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'opening_balances',
  indexes: [
    {
      unique: true,
      fields: ['kunchinintuId', 'date'],
      name: 'unique_kunchinittu_date'
    },
    { fields: ['kunchinintuId'] },
    { fields: ['date'] },
    { fields: ['createdBy'] },
    { fields: ['isManual'] },
    { fields: ['createdAt'] }
  ],
  validate: {
    // Custom validation to ensure logical consistency
    balanceConsistency() {
      if (this.openingBags < 0 || this.openingNetWeight < 0) {
        throw new Error('Opening balance cannot be negative');
      }
      if (this.openingBags > 0 && this.openingNetWeight <= 0) {
        throw new Error('If bags are present, net weight must be greater than 0');
      }
    }
  }
});

// Associations
OpeningBalance.belongsTo(Kunchinittu, { 
  foreignKey: 'kunchinintuId', 
  as: 'kunchinittu' 
});

OpeningBalance.belongsTo(User, { 
  foreignKey: 'createdBy', 
  as: 'creator' 
});

// Instance methods
OpeningBalance.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  
  // Convert decimal to number for JSON serialization
  if (values.openingNetWeight) {
    values.openingNetWeight = parseFloat(values.openingNetWeight);
  }
  
  return values;
};

// Class methods
OpeningBalance.findByKunchinintuAndDate = async function(kunchinintuId, date) {
  return await this.findOne({
    where: {
      kunchinintuId,
      date
    },
    include: [
      { model: Kunchinittu, as: 'kunchinittu', attributes: ['name', 'code'] },
      { model: User, as: 'creator', attributes: ['username'] }
    ]
  });
};

OpeningBalance.findLatestByKunchinittu = async function(kunchinintuId, beforeDate = null) {
  const where = { kunchinintuId };
  
  if (beforeDate) {
    where.date = { [sequelize.Sequelize.Op.lt]: beforeDate };
  }
  
  return await this.findOne({
    where,
    order: [['date', 'DESC']],
    include: [
      { model: Kunchinittu, as: 'kunchinittu', attributes: ['name', 'code'] },
      { model: User, as: 'creator', attributes: ['username'] }
    ]
  });
};

module.exports = OpeningBalance;