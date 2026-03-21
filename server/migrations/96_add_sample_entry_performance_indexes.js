'use strict';

/**
 * Migration 96: Performance composite indexes for sample_entries and related tables
 * 
 * Optimized for 30 lakh (3M) records with <1 second query times.
 * Uses CONCURRENTLY to avoid locking tables during creation.
 */

module.exports = {
    up: async () => {
        const { sequelize } = require('../config/database');

        const indexes = [
            // Composite index for the most common query pattern: filter by status + sort by date
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_se_status_date_broker 
       ON sample_entries(workflow_status, entry_date DESC, broker_name)`,

            // Composite for status + date + created_at (pagination sort order)
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_se_status_date_created 
       ON sample_entries(workflow_status, entry_date DESC, created_at DESC)`,

            // Composite for broker exact match + status (dropdown filter)
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_se_broker_status 
       ON sample_entries(broker_name, workflow_status)`,

            // Composite for variety exact match + status (dropdown filter)
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_se_variety_status 
       ON sample_entries(variety, workflow_status)`,

            // Covering index for quality_parameters (most joined table)
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qp_sample_entry_cover 
       ON quality_parameters(sample_entry_id)`,

            // Index for sample_entry_offerings lookup
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_seo_sample_entry_finalized 
       ON sample_entry_offerings(sample_entry_id, is_finalized)`,

            // Index for cooking_reports lookup
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cr_sample_entry_status 
       ON cooking_reports(sample_entry_id)`,

            // Index for lot_allotments by supervisor (physical_supervisor queries)
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_la_supervisor_id 
       ON lot_allotments(allotted_to_supervisor_id)`,

            // Composite index: lot_allotments by sample_entry + supervisor
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_la_entry_supervisor 
       ON lot_allotments(sample_entry_id, allotted_to_supervisor_id)`,

            // Physical inspections by lot_allotment
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pi_lot_allotment 
       ON physical_inspections(lot_allotment_id)`,

            // Inventory data by physical_inspection
            `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_id_physical_inspection 
       ON inventory_data(physical_inspection_id)`
        ];

        for (const sql of indexes) {
            try {
                await sequelize.query(sql);
            } catch (error) {
                // Ignore "already exists" errors
                if (!error.message.includes('already exists')) {
                    console.log(`⚠️ Index warning: ${error.message}`);
                }
            }
        }

        console.log('✅ All sample entry performance indexes created');
    },

    down: async () => {
        const { sequelize } = require('../config/database');

        const dropIndexes = [
            'DROP INDEX IF EXISTS idx_se_status_date_broker',
            'DROP INDEX IF EXISTS idx_se_status_date_created',
            'DROP INDEX IF EXISTS idx_se_broker_status',
            'DROP INDEX IF EXISTS idx_se_variety_status',
            'DROP INDEX IF EXISTS idx_qp_sample_entry_cover',
            'DROP INDEX IF EXISTS idx_seo_sample_entry_finalized',
            'DROP INDEX IF EXISTS idx_cr_sample_entry_status',
            'DROP INDEX IF EXISTS idx_la_supervisor_id',
            'DROP INDEX IF EXISTS idx_la_entry_supervisor',
            'DROP INDEX IF EXISTS idx_pi_lot_allotment',
            'DROP INDEX IF EXISTS idx_id_physical_inspection'
        ];

        for (const sql of dropIndexes) {
            await sequelize.query(sql).catch(() => { });
        }
    }
};
