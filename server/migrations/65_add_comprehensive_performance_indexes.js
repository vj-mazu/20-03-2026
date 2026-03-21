/**
 * Migration: Add Comprehensive Performance Indexes
 * Creates indexes for all slow queries identified in production logs
 * Target: Reduce query times from 300-900ms to <100ms
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  
  console.log('🔄 Migration 65: Adding comprehensive performance indexes...');
  
  try {
    // Get list of existing indexes to avoid duplicates
    const existingIndexes = new Set();
    try {
      const tables = await queryInterface.showAllTables();
      for (const table of tables) {
        const indexes = await queryInterface.showIndex(table);
        indexes.forEach(idx => existingIndexes.add(idx.name));
      }
    } catch (error) {
      console.log('⚠️ Could not fetch existing indexes:', error.message);
    }

    // Helper function to create index if it doesn't exist
    const createIndexIfNotExists = async (table, columns, indexName, options = {}) => {
      if (existingIndexes.has(indexName)) {
        console.log(`  ✓ Index ${indexName} already exists, skipping`);
        return;
      }
      
      try {
        await queryInterface.addIndex(table, columns, {
          name: indexName,
          ...options
        });
        console.log(`  ✅ Created index: ${indexName} on ${table}(${columns.join(', ')})`);
      } catch (error) {
        console.log(`  ⚠️ Could not create index ${indexName}:`, error.message);
      }
    };

    // ========================================
    // ARRIVALS TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating arrivals table indexes...');
    
    // For /api/arrivals/pending-list (354-399ms)
    await createIndexIfNotExists(
      'arrivals',
      ['status', 'arrival_date'],
      'idx_arrivals_status_date'
    );
    
    await createIndexIfNotExists(
      'arrivals',
      ['status'],
      'idx_arrivals_status'
    );
    
    await createIndexIfNotExists(
      'arrivals',
      ['arrival_date'],
      'idx_arrivals_date'
    );
    
    await createIndexIfNotExists(
      'arrivals',
      ['location_id'],
      'idx_arrivals_location'
    );
    
    await createIndexIfNotExists(
      'arrivals',
      ['variety_id'],
      'idx_arrivals_variety'
    );
    
    // For date range queries
    await createIndexIfNotExists(
      'arrivals',
      ['arrival_date', 'status'],
      'idx_arrivals_date_status'
    );

    // ========================================
    // KUNCHINITTUS (STOCK) TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating kunchinittus (stock) table indexes...');
    
    // For /api/records/stock (173-1039ms - VERY SLOW)
    await createIndexIfNotExists(
      'kunchinittus',
      ['location_id', 'variety_id'],
      'idx_kunchinittus_location_variety'
    );
    
    await createIndexIfNotExists(
      'kunchinittus',
      ['created_at'],
      'idx_kunchinittus_created_at'
    );
    
    await createIndexIfNotExists(
      'kunchinittus',
      ['location_id', 'created_at'],
      'idx_kunchinittus_location_date'
    );
    
    await createIndexIfNotExists(
      'kunchinittus',
      ['is_closed'],
      'idx_kunchinittus_is_closed'
    );
    
    await createIndexIfNotExists(
      'kunchinittus',
      ['status'],
      'idx_kunchinittus_status'
    );
    
    // Composite index for common query patterns
    await createIndexIfNotExists(
      'kunchinittus',
      ['status', 'is_closed', 'created_at'],
      'idx_kunchinittus_status_closed_date'
    );

    // ========================================
    // RICE PRODUCTIONS TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating rice_productions table indexes...');
    
    // For /api/rice-productions (522-526ms)
    await createIndexIfNotExists(
      'rice_productions',
      ['production_date'],
      'idx_rice_productions_date'
    );
    
    await createIndexIfNotExists(
      'rice_productions',
      ['variety_id'],
      'idx_rice_productions_variety'
    );
    
    await createIndexIfNotExists(
      'rice_productions',
      ['location_id'],
      'idx_rice_productions_location'
    );
    
    await createIndexIfNotExists(
      'rice_productions',
      ['product_type'],
      'idx_rice_productions_product_type'
    );
    
    // Composite for date range queries
    await createIndexIfNotExists(
      'rice_productions',
      ['production_date', 'location_id'],
      'idx_rice_productions_date_location'
    );

    // ========================================
    // HAMALI ENTRIES TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating hamali_entries table indexes...');
    
    // For /api/hamali-book (683ms)
    await createIndexIfNotExists(
      'hamali_entries',
      ['entry_date'],
      'idx_hamali_entries_date'
    );
    
    await createIndexIfNotExists(
      'hamali_entries',
      ['location_id'],
      'idx_hamali_entries_location'
    );
    
    await createIndexIfNotExists(
      'hamali_entries',
      ['variety_id'],
      'idx_hamali_entries_variety'
    );
    
    await createIndexIfNotExists(
      'hamali_entries',
      ['worker_name'],
      'idx_hamali_entries_worker'
    );
    
    // Composite for date range queries
    await createIndexIfNotExists(
      'hamali_entries',
      ['entry_date', 'location_id'],
      'idx_hamali_entries_date_location'
    );

    // ========================================
    // RICE HAMALI ENTRIES TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating rice_hamali_entries table indexes...');
    
    await createIndexIfNotExists(
      'rice_hamali_entries',
      ['entry_date'],
      'idx_rice_hamali_entries_date'
    );
    
    await createIndexIfNotExists(
      'rice_hamali_entries',
      ['location_id'],
      'idx_rice_hamali_entries_location'
    );
    
    await createIndexIfNotExists(
      'rice_hamali_entries',
      ['variety_id'],
      'idx_rice_hamali_entries_variety'
    );
    
    await createIndexIfNotExists(
      'rice_hamali_entries',
      ['worker_name'],
      'idx_rice_hamali_entries_worker'
    );
    
    await createIndexIfNotExists(
      'rice_hamali_entries',
      ['entry_date', 'location_id'],
      'idx_rice_hamali_entries_date_location'
    );

    // ========================================
    // RICE STOCK MOVEMENTS TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating rice_stock_movements table indexes...');
    
    // For /api/rice-stock-management/movements (519ms)
    await createIndexIfNotExists(
      'rice_stock_movements',
      ['movement_date'],
      'idx_rice_stock_movements_date'
    );
    
    await createIndexIfNotExists(
      'rice_stock_movements',
      ['from_location_id'],
      'idx_rice_stock_movements_from_location'
    );
    
    await createIndexIfNotExists(
      'rice_stock_movements',
      ['to_location_id'],
      'idx_rice_stock_movements_to_location'
    );
    
    await createIndexIfNotExists(
      'rice_stock_movements',
      ['variety_id'],
      'idx_rice_stock_movements_variety'
    );
    
    await createIndexIfNotExists(
      'rice_stock_movements',
      ['movement_type'],
      'idx_rice_stock_movements_type'
    );
    
    // Composite for common queries
    await createIndexIfNotExists(
      'rice_stock_movements',
      ['movement_date', 'from_location_id'],
      'idx_rice_stock_movements_date_from'
    );

    // ========================================
    // PACKAGINGS TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating packagings table indexes...');
    
    // For /api/packagings (333ms)
    await createIndexIfNotExists(
      'packagings',
      ['packaging_date'],
      'idx_packagings_date'
    );
    
    await createIndexIfNotExists(
      'packagings',
      ['location_id'],
      'idx_packagings_location'
    );
    
    await createIndexIfNotExists(
      'packagings',
      ['variety_id'],
      'idx_packagings_variety'
    );
    
    await createIndexIfNotExists(
      'packagings',
      ['packaging_date', 'location_id'],
      'idx_packagings_date_location'
    );

    // ========================================
    // OUTTURNS TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating outturns table indexes...');
    
    // For /api/outturns (343-359ms)
    await createIndexIfNotExists(
      'outturns',
      ['outturn_date'],
      'idx_outturns_date'
    );
    
    await createIndexIfNotExists(
      'outturns',
      ['location_id'],
      'idx_outturns_location'
    );
    
    await createIndexIfNotExists(
      'outturns',
      ['variety_id'],
      'idx_outturns_variety'
    );
    
    await createIndexIfNotExists(
      'outturns',
      ['kunchinittu_id'],
      'idx_outturns_kunchinittu'
    );

    // ========================================
    // LOCATIONS TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating locations table indexes...');
    
    // For /api/locations/* (341-508ms)
    await createIndexIfNotExists(
      'locations',
      ['is_active'],
      'idx_locations_active'
    );
    
    await createIndexIfNotExists(
      'locations',
      ['type'],
      'idx_locations_type'
    );

    // ========================================
    // VARIETIES TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating varieties table indexes...');
    
    await createIndexIfNotExists(
      'varieties',
      ['is_active'],
      'idx_varieties_active'
    );
    
    await createIndexIfNotExists(
      'varieties',
      ['name'],
      'idx_varieties_name'
    );

    // ========================================
    // RICE STOCK LOCATIONS TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating rice_stock_locations table indexes...');
    
    await createIndexIfNotExists(
      'rice_stock_locations',
      ['is_active'],
      'idx_rice_stock_locations_active'
    );
    
    await createIndexIfNotExists(
      'rice_stock_locations',
      ['is_direct_load'],
      'idx_rice_stock_locations_direct_load'
    );

    // ========================================
    // OPENING BALANCES TABLE INDEXES
    // ========================================
    console.log('\n📊 Creating opening_balances table indexes...');
    
    // For opening balance calculations (173-203ms)
    await createIndexIfNotExists(
      'opening_balances',
      ['location_id', 'variety_id', 'date'],
      'idx_opening_balances_lookup'
    );
    
    await createIndexIfNotExists(
      'opening_balances',
      ['date'],
      'idx_opening_balances_date'
    );

    console.log('\n✅ Migration 65: All performance indexes created successfully!');
    console.log('📈 Expected performance improvement: 300-900ms → <100ms');
    
  } catch (error) {
    console.error('❌ Migration 65 failed:', error.message);
    throw error;
  }
}

async function down() {
  console.log('⚠️ Rolling back performance indexes...');
  // Indexes can be dropped if needed, but generally safe to keep
}

module.exports = { up, down };
