'use strict';

/**
 * Migration 90: Ultra-Performance Composite Indexes
 * 
 * These indexes are specifically designed for the most common query patterns
 * that handle 10 lakh+ records. Each index covers a specific route's WHERE clause
 * to enable index-only scans where possible.
 */
module.exports = {
    async up(queryInterface, Sequelize) {
        console.log('📊 Adding ultra-performance composite indexes...');

        // Helper to safely create index
        const safeCreateIndex = async (table, columns, options) => {
            try {
                await queryInterface.addIndex(table, columns, options);
                console.log(`  ✅ Created index: ${options.name}`);
            } catch (err) {
                if (err.message.includes('already exists') || err.name === 'SequelizeDatabaseError') {
                    console.log(`  ⏭️ Index ${options.name} already exists, skipping`);
                } else {
                    console.error(`  ❌ Failed to create index ${options.name}:`, err.message);
                }
            }
        };

        // === ARRIVALS TABLE — Most queried table ===

        // 1. Kunchinittu Ledger INWARD query: WHERE "toKunchinintuId" = ? AND status = 'approved' AND "movementType" IN (...)
        await safeCreateIndex('arrivals', ['toKunchinintuId', 'status', 'movementType', 'date'], {
            name: 'idx_arrivals_inward_ledger',
            where: { status: 'approved' }
        });

        // 2. Kunchinittu Ledger OUTWARD query: WHERE "fromKunchinintuId" = ? AND status = 'approved' AND "movementType" IN (...)
        await safeCreateIndex('arrivals', ['fromKunchinintuId', 'status', 'movementType', 'date'], {
            name: 'idx_arrivals_outward_ledger',
            where: { status: 'approved' }
        });

        // 3. Average rate calculation: JOIN purchase_rates ON arrivalId — covering index for aggregation
        await safeCreateIndex('arrivals', ['toKunchinintuId', 'movementType', 'status', 'netWeight'], {
            name: 'idx_arrivals_rate_calc',
            where: { status: 'approved', movementType: 'purchase' }
        });

        // 4. Outturn ID lookups (for rice production linking): WHERE outturnId IS NOT NULL
        await safeCreateIndex('arrivals', ['outturnId'], {
            name: 'idx_arrivals_outturn_nonnull',
            where: { outturnId: { [Sequelize.Op.ne]: null } }
        });

        // 5. Date + status for date-range queries across all tables
        await safeCreateIndex('arrivals', ['date', 'status'], {
            name: 'idx_arrivals_date_status'
        });

        // === RICE STOCK MOVEMENTS — Second most queried ===

        // 6. Movements list with date filtering: WHERE date DESC, status
        await safeCreateIndex('rice_stock_movements', ['date', 'status', 'movement_type', 'product_type'], {
            name: 'idx_rsm_date_filters'
        });

        // 7. Pending approval queries: WHERE status = 'pending' — partial index
        await safeCreateIndex('rice_stock_movements', ['status', 'date', 'created_at'], {
            name: 'idx_rsm_pending_approval',
            where: { status: 'pending' }
        });

        // 8. Stock calculation (opening balance): WHERE date < ? AND status = 'approved'
        await safeCreateIndex('rice_stock_movements', ['status', 'date', 'movement_type', 'location_code', 'variety'], {
            name: 'idx_rsm_stock_calc',
            where: { status: 'approved' }
        });

        // === PURCHASE RATES — Average rate calculations ===

        // 9. Purchase rate lookups by arrivalId with covering columns
        await safeCreateIndex('purchase_rates', ['arrival_id', 'total_amount'], {
            name: 'idx_purchase_rates_arrival_amount'
        });

        // === RICE PRODUCTIONS — Consumption calculations ===

        // 10. Rice production by outturn + status (for paddy stock & ledger)
        await safeCreateIndex('rice_productions', ['outturnId', 'status', 'date'], {
            name: 'idx_rice_prod_outturn_status',
            where: { status: 'approved' }
        });

        // === SAMPLE ENTRIES — Workflow queries ===

        // 11. Sample entries workflow status index
        await safeCreateIndex('sample_entries', ['workflow_status', 'created_at'], {
            name: 'idx_sample_entries_workflow'
        });

        console.log('📊 Ultra-performance composite indexes complete!');
    },

    async down(queryInterface) {
        const indexes = [
            { table: 'arrivals', name: 'idx_arrivals_inward_ledger' },
            { table: 'arrivals', name: 'idx_arrivals_outward_ledger' },
            { table: 'arrivals', name: 'idx_arrivals_rate_calc' },
            { table: 'arrivals', name: 'idx_arrivals_outturn_nonnull' },
            { table: 'arrivals', name: 'idx_arrivals_date_status' },
            { table: 'rice_stock_movements', name: 'idx_rsm_date_filters' },
            { table: 'rice_stock_movements', name: 'idx_rsm_pending_approval' },
            { table: 'rice_stock_movements', name: 'idx_rsm_stock_calc' },
            { table: 'purchase_rates', name: 'idx_purchase_rates_arrival_amount' },
            { table: 'rice_productions', name: 'idx_rice_prod_outturn_status' },
            { table: 'sample_entries', name: 'idx_sample_entries_workflow' }
        ];

        for (const idx of indexes) {
            try {
                await queryInterface.removeIndex(idx.table, idx.name);
            } catch (err) {
                console.log(`Index ${idx.name} not found, skipping removal`);
            }
        }
    }
};
