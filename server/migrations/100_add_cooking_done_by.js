/**
 * Migration 100: Add cooking_done_by column to cooking_reports
 * 
 * Stores who did the cooking (selected from dropdown or typed manually).
 * Safe to run on every startup — uses IF NOT EXISTS pattern.
 */

const { sequelize } = require('../config/database');

async function up() {
    try {
        console.log('🔄 Migration 100: Adding cooking_done_by to cooking_reports...');

        const [results] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'cooking_reports'
        AND column_name = 'cooking_done_by'
    `);

        if (results.length > 0) {
            console.log('✅ Migration 100: cooking_done_by column already exists, skipping');
            return;
        }

        await sequelize.query(`
      ALTER TABLE cooking_reports
      ADD COLUMN cooking_done_by TEXT
    `);

        console.log('✅ Migration 100: cooking_done_by column added to cooking_reports');
    } catch (error) {
        console.error('❌ Migration 100 error:', error.message);
        throw error;
    }
}

async function down() {
    try {
        console.log('🔄 Rolling back Migration 100...');
        await sequelize.query('ALTER TABLE cooking_reports DROP COLUMN IF EXISTS cooking_done_by');
        console.log('✅ Migration 100: Rolled back successfully');
    } catch (error) {
        console.error('❌ Migration 100 rollback error:', error.message);
        throw error;
    }
}

module.exports = { up, down };
