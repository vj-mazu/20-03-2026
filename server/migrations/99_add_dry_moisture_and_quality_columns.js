/**
 * Migration 70: Add dryMoisture to quality_parameters and qualityName to users
 */
module.exports = async function () {
    const { sequelize } = require('../config/database');

    try {
        // Add dryMoisture to quality_parameters table
        await sequelize.query(`
            ALTER TABLE quality_parameters ADD COLUMN IF NOT EXISTS "dryMoisture" DECIMAL(10,2) DEFAULT NULL;
        `);
        console.log('✅ Added dryMoisture column to quality_parameters table');
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('ℹ️ dryMoisture column already exists');
        } else {
            console.error('Error adding dryMoisture:', error.message);
        }
    }

    try {
        // Add qualityName to users table (if not exists)
        await sequelize.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS "qualityName" VARCHAR(100) DEFAULT NULL;
        `);
        console.log('✅ Added qualityName column to users table');
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('ℹ️ qualityName column already exists');
        } else {
            console.error('Error adding qualityName:', error.message);
        }
    }
};
