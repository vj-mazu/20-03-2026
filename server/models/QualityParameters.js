/**
 * QualityParameters Model
 * 
 * Stores quality parameters added by Quality Supervisors.
 * Contains all quality measurement fields for rice sample evaluation.
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const QualityParameters = sequelize.define('QualityParameters', {
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
  reportedByUserId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'reported_by_user_id',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  moisture: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  moistureRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'moisture_raw'
  },
  dryMoisture: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
    field: 'dryMoisture'
  },
  dryMoistureRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'dry_moisture_raw'
  },
  cutting1: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'cutting_1'
  },
  cutting1Raw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'cutting_1_raw'
  },
  cutting2: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'cutting_2'
  },
  cutting2Raw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'cutting_2_raw'
  },
  bend: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0
  },
  bend1: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'bend_1'
  },
  bend1Raw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'bend_1_raw'
  },
  bend2: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'bend_2'
  },
  bend2Raw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'bend_2_raw'
  },
  mixS: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '0',
    field: 'mix_s'
  },
  mixSRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'mix_s_raw'
  },
  mixL: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '0',
    field: 'mix_l'
  },
  mixLRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'mix_l_raw'
  },
  mix: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '0'
  },
  mixRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'mix_raw'
  },
  kandu: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '0'
  },
  kanduRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'kandu_raw'
  },
  oil: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '0'
  },
  oilRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'oil_raw'
  },
  sk: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: '0'
  },
  skRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'sk_raw'
  },
  grainsCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    field: 'grains_count',
    validate: {
      min: 0
    }
  },
  grainsCountRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'grains_count_raw'
  },
  gramsReport: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'grams_report'
  },
  wbR: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'wb_r'
  },
  wbRRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'wb_r_raw'
  },
  wbBk: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'wb_bk'
  },
  wbBkRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'wb_bk_raw'
  },
  wbT: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'wb_t'
  },
  wbTRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'wb_t_raw'
  },
  paddyWb: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 0,
    field: 'paddy_wb'
  },
  paddyWbRaw: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'paddy_wb_raw'
  },
  smixEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    field: 'smix_enabled'
  },
  lmixEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    field: 'lmix_enabled'
  },
  paddyWbEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    field: 'paddy_wb_enabled'
  },
  reportedBy: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'reported_by'
  },
  smellHas: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false,
    field: 'smell_has'
  },
  smellType: {
    type: DataTypes.STRING(30),
    allowNull: true,
    field: 'smell_type'
  },
  uploadFileUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'upload_file_url'
  }
}, {
  tableName: 'quality_parameters',
  underscored: true,
  indexes: [
    { fields: ['sample_entry_id'], unique: true },
    { fields: ['reported_by_user_id'] }
  ]
});

// Associations
QualityParameters.associate = (models) => {
  QualityParameters.belongsTo(models.SampleEntry, {
    foreignKey: 'sampleEntryId',
    as: 'sampleEntry'
  });

  QualityParameters.belongsTo(models.User, {
    foreignKey: 'reportedByUserId',
    as: 'reportedByUser'
  });
};

module.exports = QualityParameters;
