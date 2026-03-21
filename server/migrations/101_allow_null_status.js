/**
 * Migration 101: Allow null status in cooking_reports
 * 
 * Allows staff to save "Cooking Done By" before an admin 
 * provides the final Pass/Fail status.
 */

const { sequelize } = require('../config/database');

async function up() {
    try {
        console.log('🔄 Migration 101: Allowing NULL status in cooking_reports...');

        await sequelize.query(`
      ALTER TABLE cooking_reports
      ALTER COLUMN status DROP NOT NULL
    `);

        console.log('✅ Migration 101: status column now allows NULL');
    } catch (error) {
        console.error('❌ Migration 101 error:', error.message);
        throw error;
    }
}

async function down() {
    try {
        console.log('🔄 Rolling back Migration 101...');
        // We can't safely re-add NOT NULL if there are nulls, but for a down migration we can try
        await sequelize.query(`
      ALTER TABLE cooking_reports
      ALTER COLUMN status SET NOT NULL
    `);
        console.log('✅ Migration 101: Rolled back successfully');
    } catch (error) {
        console.error('❌ Migration 101 rollback error:', error.message);
        throw error;
    }
}

module.exports = { up, down };
