/**
 * InventoryData Model
 * 
 * Stores inventory weight measurements and location data.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InventoryData = sequelize.define('InventoryData', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  physicalInspectionId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'physical_inspection_id',
    references: {
      model: 'physical_inspections',
      key: 'id'
    }
  },
  recordedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'recorded_by_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  entryDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'entry_date'
  },
  variety: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  bags: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  moisture: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100
    }
  },
  wbNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'wb_number'
  },
  grossWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'gross_weight',
    validate: {
      min: 0
    }
  },
  tareWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'tare_weight',
    validate: {
      min: 0
    }
  },
  netWeight: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    field: 'net_weight',
    validate: {
      min: 0
    }
  },
  location: {
    type: DataTypes.ENUM('DIRECT_KUNCHINITTU', 'WAREHOUSE', 'DIRECT_OUTTURN_PRODUCTION'),
    allowNull: false
  },
  kunchinittuId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'kunchinittu_id',
    references: {
      model: 'kunchinittus',
      key: 'id'
    }
  },
  outturnId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'outturn_id',
    references: {
      model: 'outturns',
      key: 'id'
    }
  }
}, {
  tableName: 'inventory_data',
  underscored: true,
  indexes: [
    { fields: ['physical_inspection_id'], unique: true },
    { fields: ['recorded_by_user_id'] },
    { fields: ['entry_date'] },
    { fields: ['variety'] },
    { fields: ['wb_number'] },
    { fields: ['location'] },
    { fields: ['kunchinittu_id'] },
    { fields: ['outturn_id'] }
  ],
  hooks: {
    beforeValidate: (inventoryData) => {
      // Auto-calculate net weight
      if (inventoryData.grossWeight && inventoryData.tareWeight) {
        inventoryData.netWeight = inventoryData.grossWeight - inventoryData.tareWeight;
      }
    }
  },
  validate: {
    grossGreaterThanTare() {
      if (this.grossWeight <= this.tareWeight) {
        throw new Error('Gross weight must be greater than tare weight');
      }
    }
  }
});

InventoryData.associate = (models) => {
  InventoryData.belongsTo(models.PhysicalInspection, {
    foreignKey: 'physicalInspectionId',
    as: 'physicalInspection'
  });

  InventoryData.belongsTo(models.User, {
    foreignKey: 'recordedByUserId',
    as: 'recordedBy'
  });

  InventoryData.hasOne(models.FinancialCalculation, {
    foreignKey: 'inventoryDataId',
    as: 'financialCalculation'
  });

  // Link to Kunchinittu and Outturn
  if (models.Kunchinittu) {
    InventoryData.belongsTo(models.Kunchinittu, {
      foreignKey: 'kunchinittuId',
      as: 'kunchinittu'
    });
  }
  if (models.Outturn) {
    InventoryData.belongsTo(models.Outturn, {
      foreignKey: 'outturnId',
      as: 'outturn'
    });
  }
};

module.exports = InventoryData;
