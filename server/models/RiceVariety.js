const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RiceVariety = sequelize.define('RiceVariety', {
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
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'rice_varieties',
    timestamps: true,
    indexes: [
        { fields: ['name'], unique: true },
        { fields: ['code'], unique: true },
        { fields: ['isActive'] }
    ]
});

module.exports = RiceVariety;
