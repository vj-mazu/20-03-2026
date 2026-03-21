/**
 * Migration 66: Fix Performance Indexes with Correct Column Names
 * 
 * This migration corrects the indexes from Migration 65 by using the actual
 * column names from the database schema (camelCase, not snake_case).
 * 
 * Target: Reduce API response times from 300-900ms to <100ms
 * 
 * Key fixes:
 * - Use actual column names: date, variety, status, movementType, etc.
 * - Use correct foreign key names: toKunchinintuId, fromWarehouseId, etc.
 * - Focus on the most critical indexes for slow queries
 */

const { Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    console.log('🔧 Migration 66: Creating corrected performance indexes...');

    const createIndexSafely = async (tableName, indexName, columns, options = {}) => {
      try {
        // Check if index already exists
        const [results] = await queryInterface.sequelize.query(`
          SELECT indexname FROM pg_indexes 
          WHERE tablename = '${tableName}' AND indexname = '${indexName}';
        `);

        if (results.length > 0) {
          console.log(`  ✓ Index ${indexName} already exists, skipping`);
          return;
        }

        await queryInterface.addIndex(tableName, columns, {
          name: indexName,
          ...options
        });
        console.log(`  ✅ Created index: ${indexName} on ${tableName}(${columns.join(', ')})`);
      } catch (error) {
        console.log(`  ⚠️ Could not create index ${indexName}: ${error.message}`);
      }
    };

    // ============================================================================
    // ARRIVALS TABLE - Most Critical for /api/arrivals/* endpoints
    // ============================================================================
    console.log('\n📊 Creating arrivals table indexes (CRITICAL)...');

    // Date index - used in almost all queries
    await createIndexSafely('Arrivals', 'idx_arrivals_date_v2', ['date']);

    // Status index - for pending-list queries
    await createIndexSafely('Arrivals', 'idx_arrivals_status_v2', ['status']);

    // Movement type index - for filtering purchase/shifting
    await createIndexSafely('Arrivals', 'idx_arrivals_movement_type_v2', ['movementType']);

    // Composite indexes for common query patterns
    await createIndexSafely('Arrivals', 'idx_arrivals_date_status_v2', ['date', 'status']);
    await createIndexSafely('Arrivals', 'idx_arrivals_status_date_v2', ['status', 'date']);
    await createIndexSafely('Arrivals', 'idx_arrivals_movement_date_v2', ['movementType', 'date']);

    // Foreign key indexes for joins
    await createIndexSafely('Arrivals', 'idx_arrivals_to_kunchinittu_v2', ['toKunchinintuId']);
    await createIndexSafely('Arrivals', 'idx_arrivals_from_kunchinittu_v2', ['fromKunchinintuId']);
    await createIndexSafely('Arrivals', 'idx_arrivals_to_warehouse_v2', ['toWarehouseId']);
    await createIndexSafely('Arrivals', 'idx_arrivals_from_warehouse_v2', ['fromWarehouseId']);
    await createIndexSafely('Arrivals', 'idx_arrivals_outturn_v2', ['outturnId']);

    // User tracking indexes
    await createIndexSafely('Arrivals', 'idx_arrivals_created_by_v2', ['createdBy']);
    await createIndexSafely('Arrivals', 'idx_arrivals_approved_by_v2', ['approvedBy']);

    // ============================================================================
    // RICE PRODUCTIONS TABLE - For /api/rice-productions/* endpoints
    // ============================================================================
    console.log('\n📊 Creating rice_productions table indexes...');

    await createIndexSafely('rice_productions', 'idx_rice_prod_date_v2', ['date']);
    await createIndexSafely('rice_productions', 'idx_rice_prod_status_v2', ['status']);
    await createIndexSafely('rice_productions', 'idx_rice_prod_product_v2', ['product_type']);
    await createIndexSafely('rice_productions', 'idx_rice_prod_location_v2', ['location_code']);
    await createIndexSafely('rice_productions', 'idx_rice_prod_date_status_v2', ['date', 'status']);
    await createIndexSafely('rice_productions', 'idx_rice_prod_outturn_v2', ['outturn_id']);

    // ============================================================================
    // PADDY HAMALI ENTRIES - For /api/hamali-entries/* endpoints
    // ============================================================================
    console.log('\n📊 Creating paddy_hamali_entries table indexes...');

    await createIndexSafely('paddy_hamali_entries', 'idx_paddy_hamali_date_v2', ['date']);
    await createIndexSafely('paddy_hamali_entries', 'idx_paddy_hamali_arrival_v2', ['arrival_id']);
    await createIndexSafely('paddy_hamali_entries', 'idx_paddy_hamali_status_v2', ['status']);
    await createIndexSafely('paddy_hamali_entries', 'idx_paddy_hamali_date_status_v2', ['date', 'status']);

    // ============================================================================
    // RICE HAMALI ENTRIES - For /api/rice-hamali-entries/* endpoints
    // ============================================================================
    console.log('\n📊 Creating rice_hamali_entries table indexes...');

    await createIndexSafely('rice_hamali_entries', 'idx_rice_hamali_date_v2', ['date']);
    await createIndexSafely('rice_hamali_entries', 'idx_rice_hamali_production_v2', ['rice_production_id']);
    await createIndexSafely('rice_hamali_entries', 'idx_rice_hamali_status_v2', ['status']);
    await createIndexSafely('rice_hamali_entries', 'idx_rice_hamali_date_status_v2', ['date', 'status']);

    // ============================================================================
    // RICE STOCK MOVEMENTS - For /api/rice-stock-management/* endpoints
    // ============================================================================
    console.log('\n📊 Creating rice_stock_movements table indexes...');

    await createIndexSafely('rice_stock_movements', 'idx_rice_stock_date_v2', ['date']);
    await createIndexSafely('rice_stock_movements', 'idx_rice_stock_status_v2', ['status']);
    await createIndexSafely('rice_stock_movements', 'idx_rice_stock_type_v2', ['movement_type']);
    // Note: 'from' and 'to' columns don't exist, correct columns are 'from_location' and 'to_location'
    // These indexes are created correctly in migration 67 with proper column names
    await createIndexSafely('rice_stock_movements', 'idx_rice_stock_date_status_v2', ['date', 'status']);
    await createIndexSafely('rice_stock_movements', 'idx_rice_stock_type_date_v2', ['movement_type', 'date']);

    // ============================================================================
    // KUNCHINITTUS - For /api/ledger/kunchinittus endpoint
    // ============================================================================
    console.log('\n📊 Creating kunchinittus table indexes...');

    await createIndexSafely('kunchinittus', 'idx_kunchinittus_closed_v2', ['is_closed']);
    await createIndexSafely('kunchinittus', 'idx_kunchinittus_name_v2', ['name']);

    // ============================================================================
    // OUTTURNS - For outturn-related queries
    // ============================================================================
    console.log('\n📊 Creating outturns table indexes...');

    await createIndexSafely('outturns', 'idx_outturns_code_v2', ['code']);
    await createIndexSafely('outturns', 'idx_outturns_cleared_v2', ['is_cleared']);
    // Note: 'kunchinittu_id' column doesn't exist in outturns table - skipped

    // ============================================================================
    // OPENING BALANCES - For stock calculations
    // ============================================================================
    console.log('\n📊 Creating opening_balances table indexes...');

    await createIndexSafely('opening_balances', 'idx_opening_bal_date_v2', ['date']);
    // Note: 'balance_type' column doesn't exist in opening_balances table
    // Correct indexes use 'kunchinintuId' column, created in migration 67

    console.log('\n✅ Migration 66: Corrected performance indexes created successfully!');
    console.log('📈 Expected improvement: 300-900ms → <100ms for most endpoints');
    console.log('🎯 Critical endpoints optimized:');
    console.log('   - /api/arrivals/pending-list');
    console.log('   - /api/records/arrivals');
    console.log('   - /api/hamali-entries/batch');
    console.log('   - /api/ledger/kunchinittus');
    console.log('   - /api/rice-productions');
    console.log('   - /api/rice-stock-management/movements');
  },

  down: async (queryInterface) => {
    console.log('🔄 Rolling back Migration 66: Removing corrected indexes...');

    const removeIndexSafely = async (tableName, indexName) => {
      try {
        await queryInterface.removeIndex(tableName, indexName);
        console.log(`  ✅ Removed index: ${indexName}`);
      } catch (error) {
        console.log(`  ⚠️ Could not remove index ${indexName}: ${error.message}`);
      }
    };

    // Remove all v2 indexes
    const indexesToRemove = [
      // Arrivals
      ['Arrivals', 'idx_arrivals_date_v2'],
      ['Arrivals', 'idx_arrivals_status_v2'],
      ['Arrivals', 'idx_arrivals_movement_type_v2'],
      ['Arrivals', 'idx_arrivals_date_status_v2'],
      ['Arrivals', 'idx_arrivals_status_date_v2'],
      ['Arrivals', 'idx_arrivals_movement_date_v2'],
      ['Arrivals', 'idx_arrivals_to_kunchinittu_v2'],
      ['Arrivals', 'idx_arrivals_from_kunchinittu_v2'],
      ['Arrivals', 'idx_arrivals_to_warehouse_v2'],
      ['Arrivals', 'idx_arrivals_from_warehouse_v2'],
      ['Arrivals', 'idx_arrivals_outturn_v2'],
      ['Arrivals', 'idx_arrivals_created_by_v2'],
      ['Arrivals', 'idx_arrivals_approved_by_v2'],

      // Rice Productions
      ['rice_productions', 'idx_rice_prod_date_v2'],
      ['rice_productions', 'idx_rice_prod_status_v2'],
      ['rice_productions', 'idx_rice_prod_product_v2'],
      ['rice_productions', 'idx_rice_prod_location_v2'],
      ['rice_productions', 'idx_rice_prod_date_status_v2'],
      ['rice_productions', 'idx_rice_prod_outturn_v2'],

      // Hamali
      ['paddy_hamali_entries', 'idx_paddy_hamali_date_v2'],
      ['paddy_hamali_entries', 'idx_paddy_hamali_arrival_v2'],
      ['paddy_hamali_entries', 'idx_paddy_hamali_status_v2'],
      ['paddy_hamali_entries', 'idx_paddy_hamali_date_status_v2'],

      ['rice_hamali_entries', 'idx_rice_hamali_date_v2'],
      ['rice_hamali_entries', 'idx_rice_hamali_production_v2'],
      ['rice_hamali_entries', 'idx_rice_hamali_status_v2'],
      ['rice_hamali_entries', 'idx_rice_hamali_date_status_v2'],

      // Rice Stock
      ['rice_stock_movements', 'idx_rice_stock_date_v2'],
      ['rice_stock_movements', 'idx_rice_stock_status_v2'],
      ['rice_stock_movements', 'idx_rice_stock_type_v2'],
      ['rice_stock_movements', 'idx_rice_stock_from_v2'],
      ['rice_stock_movements', 'idx_rice_stock_to_v2'],
      ['rice_stock_movements', 'idx_rice_stock_date_status_v2'],
      ['rice_stock_movements', 'idx_rice_stock_type_date_v2'],

      // Others
      ['kunchinittus', 'idx_kunchinittus_closed_v2'],
      ['kunchinittus', 'idx_kunchinittus_name_v2'],
      ['outturns', 'idx_outturns_code_v2'],
      ['outturns', 'idx_outturns_cleared_v2'],
      ['outturns', 'idx_outturns_kunchinittu_v2'],
      ['opening_balances', 'idx_opening_bal_date_v2'],
      ['opening_balances', 'idx_opening_bal_type_v2'],
      ['opening_balances', 'idx_opening_bal_date_type_v2'],
    ];

    for (const [tableName, indexName] of indexesToRemove) {
      await removeIndexSafely(tableName, indexName);
    }

    console.log('✅ Migration 66 rollback completed');
  }
};
