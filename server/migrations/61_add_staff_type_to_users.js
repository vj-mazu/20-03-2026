/**
 * Migration 61: Add staffType column to users table
 * Stores 'mill' or 'location' for staff users to control tab visibility
 */
module.exports = {
    up: async () => {
        const { sequelize } = require('../config/database');
        try {
            await sequelize.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS "staffType" VARCHAR(20) DEFAULT NULL;
      `);
            console.log('✅ Added staffType column to users table');
        } catch (error) {
            if (error.message.includes('already exists')) {
                console.log('ℹ️ staffType column already exists');
            } else {
                throw error;
            }
        }
    }
};
