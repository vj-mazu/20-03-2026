/**
 * Migration: Fix purchase_rates table - add all missing columns
 * Run directly on server startup if table exists but missing columns
 */

const { DataTypes, Sequelize } = require('sequelize');

module.exports = {
    up: async (queryInterface) => {
        try {
            console.log('🔄 Migration: Fixing purchase_rates table - adding missing columns...');

            // Check if purchase_rates table exists
            const tables = await queryInterface.sequelize.query(
                `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_rates'`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            if (tables.length === 0) {
                console.log('⚠️ purchase_rates table does not exist - creating it...');

                // Create the table with all columns
                await queryInterface.sequelize.query(`
          CREATE TABLE IF NOT EXISTS purchase_rates (
            id SERIAL PRIMARY KEY,
            arrival_id INTEGER NOT NULL UNIQUE REFERENCES arrivals(id) ON DELETE CASCADE,
            sute DECIMAL(10, 2) NOT NULL DEFAULT 0,
            sute_calculation_method VARCHAR(20) NOT NULL DEFAULT 'per_bag',
            base_rate DECIMAL(10, 2) NOT NULL,
            rate_type VARCHAR(20) NOT NULL DEFAULT 'CDL',
            base_rate_calculation_method VARCHAR(20) NOT NULL DEFAULT 'per_bag',
            h DECIMAL(10, 2) NOT NULL DEFAULT 0,
            b DECIMAL(10, 2) NOT NULL DEFAULT 0,
            b_calculation_method VARCHAR(20) NOT NULL DEFAULT 'per_bag',
            lf DECIMAL(10, 2) NOT NULL DEFAULT 0,
            lf_calculation_method VARCHAR(20) NOT NULL DEFAULT 'per_bag',
            egb DECIMAL(10, 2) NOT NULL DEFAULT 0,
            amount_formula VARCHAR(200) NOT NULL DEFAULT '',
            total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
            average_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
            created_by INTEGER NOT NULL REFERENCES users(id),
            updated_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
          )
        `);

                console.log('✅ Created purchase_rates table with all columns');
                return;
            }

            // Table exists - check for each column and add if missing
            const tableDescription = await queryInterface.describeTable('purchase_rates');
            console.log('📊 Existing columns:', Object.keys(tableDescription));

            // List of columns that should exist with their definitions
            const requiredColumns = [
                { name: 'rate_type', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS rate_type VARCHAR(20) NOT NULL DEFAULT 'CDL'` },
                { name: 'sute', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS sute DECIMAL(10, 2) NOT NULL DEFAULT 0` },
                { name: 'sute_calculation_method', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS sute_calculation_method VARCHAR(20) NOT NULL DEFAULT 'per_bag'` },
                { name: 'base_rate_calculation_method', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS base_rate_calculation_method VARCHAR(20) NOT NULL DEFAULT 'per_bag'` },
                { name: 'b_calculation_method', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS b_calculation_method VARCHAR(20) NOT NULL DEFAULT 'per_bag'` },
                { name: 'lf_calculation_method', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS lf_calculation_method VARCHAR(20) NOT NULL DEFAULT 'per_bag'` },
                { name: 'base_rate', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS base_rate DECIMAL(10, 2) NOT NULL DEFAULT 0` },
                { name: 'h', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS h DECIMAL(10, 2) NOT NULL DEFAULT 0` },
                { name: 'b', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS b DECIMAL(10, 2) NOT NULL DEFAULT 0` },
                { name: 'lf', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS lf DECIMAL(10, 2) NOT NULL DEFAULT 0` },
                { name: 'egb', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS egb DECIMAL(10, 2) NOT NULL DEFAULT 0` },
                { name: 'amount_formula', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS amount_formula VARCHAR(200) NOT NULL DEFAULT ''` },
                { name: 'total_amount', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0` },
                { name: 'average_rate', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS average_rate DECIMAL(10, 2) NOT NULL DEFAULT 0` },
                { name: 'created_by', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS created_by INTEGER` },
                { name: 'updated_by', sql: `ALTER TABLE purchase_rates ADD COLUMN IF NOT EXISTS updated_by INTEGER` }
            ];

            for (const col of requiredColumns) {
                if (!tableDescription[col.name]) {
                    console.log(`➕ Adding missing column: ${col.name}`);
                    try {
                        await queryInterface.sequelize.query(col.sql);
                        console.log(`✅ Added column: ${col.name}`);
                    } catch (err) {
                        console.log(`⚠️ Could not add ${col.name}: ${err.message}`);
                    }
                }
            }

            console.log('✅ Migration complete: purchase_rates table now has all required columns');

        } catch (error) {
            console.error('❌ Migration failed:', error.message);
            throw error;
        }
    },

    down: async (queryInterface) => {
        // Nothing to do for down migration - we don't want to remove columns
        console.log('⏬ Down migration: No action needed');
    }
};
