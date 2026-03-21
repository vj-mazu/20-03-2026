/**
 * Migration 94: Add composite indexes for 10 lakh record performance
 * 
 * These indexes target the exact JOIN patterns used in SampleEntryRepository
 * and other high-traffic queries. They speed up the most expensive operations
 * without changing any logic or UI.
 * 
 * Safe to run multiple times (IF NOT EXISTS).
 */
const { sequelize } = require('../config/database');

module.exports = {
    async up() {
        const qi = sequelize.getQueryInterface();

        const indexes = [
            // LotAllotment: supervisor filtering (physical_supervisor role queries)
            `CREATE INDEX IF NOT EXISTS idx_lot_allotments_supervisor_sample
       ON lot_allotments (allotted_to_supervisor_id, sample_entry_id)`,

            // PhysicalInspection: lot + created_at for ordered listing by lot
            `CREATE INDEX IF NOT EXISTS idx_physical_inspections_lot_created
       ON physical_inspections (lot_allotment_id, created_at DESC)`,

            // InventoryData: physicalInspectionId is already unique indexed — add composite for location queries
            `CREATE INDEX IF NOT EXISTS idx_inventory_data_variety_location
       ON inventory_data (variety, location)`,

            // FinancialCalculation: inventory_data_id is already unique — add composite for type lookups
            `CREATE INDEX IF NOT EXISTS idx_financial_calculations_inventory_created
       ON financial_calculations (inventory_data_id, created_at DESC)`,

            // SampleEntry: workflow status + created_at for role-based listing (most common query)
            `CREATE INDEX IF NOT EXISTS idx_sample_entries_status_created
       ON sample_entries (workflow_status, created_at DESC)`,

            // SampleEntry: entry_date + workflow_status for date-filtered queries  
            `CREATE INDEX IF NOT EXISTS idx_sample_entries_date_status
       ON sample_entries (entry_date DESC, workflow_status)`,

            // SampleEntry: broker + variety for text search performance
            `CREATE INDEX IF NOT EXISTS idx_sample_entries_broker_variety
       ON sample_entries (broker_name, variety)`,

            // PaddyHamaliEntry: date + status for listing queries (no pagination currently)
            `CREATE INDEX IF NOT EXISTS idx_paddy_hamali_entries_date
       ON paddy_hamali_entries (date DESC)`,

            // OtherHamaliEntry: date for listing queries
            `CREATE INDEX IF NOT EXISTS idx_other_hamali_entries_date
       ON other_hamali_entries (date DESC)`,

            // Enable pg_trgm extension for fast LIKE '%text%' searches
            `CREATE EXTENSION IF NOT EXISTS pg_trgm`,

            // Trigram indexes for text search on SampleEntry (replaces slow LIKE scans)
            `CREATE INDEX IF NOT EXISTS idx_sample_entries_broker_trgm
       ON sample_entries USING gin (broker_name gin_trgm_ops)`,

            `CREATE INDEX IF NOT EXISTS idx_sample_entries_variety_trgm
       ON sample_entries USING gin (variety gin_trgm_ops)`,

            `CREATE INDEX IF NOT EXISTS idx_sample_entries_party_trgm
       ON sample_entries USING gin (party_name gin_trgm_ops)`,

            // Trigram indexes for Arrival text search (records.js search)
            `CREATE INDEX IF NOT EXISTS idx_arrivals_broker_trgm
       ON arrivals USING gin (broker gin_trgm_ops)`,

            `CREATE INDEX IF NOT EXISTS idx_arrivals_variety_trgm
       ON arrivals USING gin (variety gin_trgm_ops)`,

            `CREATE INDEX IF NOT EXISTS idx_arrivals_lorry_number_trgm
       ON arrivals USING gin ("lorryNumber" gin_trgm_ops)`
        ];

        for (const sql of indexes) {
            try {
                await sequelize.query(sql);
            } catch (err) {
                // Skip if index already exists or column doesn't exist yet
                console.log(`  ℹ️ Index skip: ${err.message.substring(0, 80)}`);
            }
        }
    }
};
