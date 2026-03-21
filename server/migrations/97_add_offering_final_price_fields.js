'use strict';

/**
 * Migration: Add enhanced offering price and final price fields to sample_entry_offerings
 * 
 * Adds: offerBaseRateValue, hamaliEnabled, hamaliPerKg, hamaliPerQuintal,
 *        brokerageEnabled, lfEnabled, lfBy, customDivisor,
 *        finalBaseRate, finalSute, finalSuteUnit
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const tableInfo = await queryInterface.describeTable('sample_entry_offerings').catch(() => null);

        if (!tableInfo) {
            // Create the table if it doesn't exist
            await queryInterface.createTable('sample_entry_offerings', {
                id: {
                    type: Sequelize.UUID,
                    defaultValue: Sequelize.UUIDV4,
                    primaryKey: true
                },
                sample_entry_id: {
                    type: Sequelize.UUID,
                    allowNull: false,
                    references: { model: 'sample_entries', key: 'id' }
                },
                offer_rate: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
                sute: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
                sute_unit: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'per_kg' },
                base_rate_type: { type: Sequelize.STRING(20), allowNull: true },
                base_rate_unit: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'per_bag' },
                offer_base_rate_value: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
                hamali: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
                hamali_unit: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'per_bag' },
                hamali_by: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'admin' },
                hamali_enabled: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
                hamali_per_kg: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
                hamali_per_quintal: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
                moisture_value: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
                brokerage: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
                brokerage_unit: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'per_bag' },
                brokerage_by: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'admin' },
                brokerage_enabled: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
                lf: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
                lf_unit: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'per_bag' },
                lf_enabled: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
                lf_by: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'manager' },
                egb_type: { type: Sequelize.STRING(20), allowNull: true, defaultValue: 'mill' },
                egb_value: { type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
                custom_divisor: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
                final_base_rate: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
                final_sute: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
                final_sute_unit: { type: Sequelize.STRING(20), allowNull: true },
                final_price: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
                is_finalized: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
                created_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'users', key: 'id' }
                },
                updated_by: {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: { model: 'users', key: 'id' }
                },
                created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
                updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW }
            });

            await queryInterface.addIndex('sample_entry_offerings', ['sample_entry_id']);
            await queryInterface.addIndex('sample_entry_offerings', ['is_finalized']);
            return;
        }

        // Table exists — add missing columns
        const columnsToAdd = [
            { name: 'offer_base_rate_value', type: Sequelize.DECIMAL(10, 2), allowNull: true },
            { name: 'hamali_enabled', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
            { name: 'hamali_per_kg', type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
            { name: 'hamali_per_quintal', type: Sequelize.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
            { name: 'brokerage_enabled', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
            { name: 'lf_enabled', type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
            { name: 'lf_by', type: Sequelize.STRING(20), allowNull: true, defaultValue: 'manager' },
            { name: 'custom_divisor', type: Sequelize.DECIMAL(10, 2), allowNull: true },
            { name: 'final_base_rate', type: Sequelize.DECIMAL(10, 2), allowNull: true },
            { name: 'final_sute', type: Sequelize.DECIMAL(10, 2), allowNull: true },
            { name: 'final_sute_unit', type: Sequelize.STRING(20), allowNull: true }
        ];

        for (const col of columnsToAdd) {
            if (!tableInfo[col.name]) {
                await queryInterface.addColumn('sample_entry_offerings', col.name, {
                    type: col.type,
                    allowNull: col.allowNull,
                    defaultValue: col.defaultValue !== undefined ? col.defaultValue : null
                });
                console.log(`✅ Added column: ${col.name}`);
            } else {
                console.log(`⏩ Column already exists: ${col.name}`);
            }
        }
    },

    down: async (queryInterface) => {
        const columnsToRemove = [
            'offer_base_rate_value', 'hamali_enabled', 'hamali_per_kg', 'hamali_per_quintal',
            'brokerage_enabled', 'lf_enabled', 'lf_by', 'custom_divisor',
            'final_base_rate', 'final_sute', 'final_sute_unit'
        ];

        for (const col of columnsToRemove) {
            await queryInterface.removeColumn('sample_entry_offerings', col).catch(() => { });
        }
    }
};
