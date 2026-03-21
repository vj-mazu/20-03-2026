const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Warehouse = sequelize.define('Warehouse', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  capacity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'warehouses',
  indexes: [
    { fields: ['name'] },
    { fields: ['code'] },
    { fields: ['isActive'] }
  ]
});

const Kunchinittu = sequelize.define('Kunchinittu', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true  // Keep Kunchinittu names unique globally
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  warehouseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Warehouse,
      key: 'id'
    }
  },
  varietyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'varieties',
      key: 'id'
    }
  },
  capacity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isClosed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_closed'
  },
  closedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'closed_at'
  },
  closedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'closed_by'
  },
  closedRemainingBags: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'closed_remaining_bags'
  },
  averageRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'average_rate'
  },
  lastRateCalculation: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_rate_calculation'
  }
}, {
  tableName: 'kunchinittus',
  indexes: [
    { fields: ['name'] },
    { fields: ['code'] },
    { fields: ['warehouseId'] },
    { fields: ['varietyId'] },
    { fields: ['isActive'] },
    { fields: ['is_closed'] }
  ]
});

const Variety = sequelize.define('Variety', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'varieties',
  indexes: [
    { fields: ['name'] },
    { fields: ['code'] },
    { fields: ['isActive'] }
  ]
});

// Associations
Kunchinittu.belongsTo(Warehouse, { foreignKey: 'warehouseId', as: 'warehouse' });
Warehouse.hasMany(Kunchinittu, { foreignKey: 'warehouseId', as: 'kunchinittus' });
Kunchinittu.belongsTo(Variety, { foreignKey: 'varietyId', as: 'variety' });
Variety.hasMany(Kunchinittu, { foreignKey: 'varietyId', as: 'kunchinittus' });

module.exports = { Warehouse, Kunchinittu, Variety };