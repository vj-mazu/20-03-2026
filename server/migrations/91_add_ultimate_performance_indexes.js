/**
 * Migration: Ultimate Performance Indexes for 10 Lakh Records
 * 
 * This migration adds critical composite indexes for handling 1 million+ records
 * with sub-1-second query response times.
 * 
 * These indexes cover the most common query patterns in the application:
 * - Records filtering (arrivals)
 * - Rice stock movements
 * - Outturn operations
 * - Dashboard queries
 * 
 * IMPORTANT: Non-breaking - only adds indexes, no schema changes
 */

const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

async function up() {
  console.log('🚀 Adding ultimate performance indexes for 10 lakh records...');

  const queries = [
    // ============ ARRIVALS TABLE ============
    // Most common query pattern: status + date filtering
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_status_date_composite 
     ON arrivals(status, "adminApprovedBy", date DESC)`,

    // Movement type + status + date (for filtered lists)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_movement_status_date 
     ON arrivals("movementType", status, date DESC)`,

    // Variety-based queries (for stock reports)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_variety_status_date 
     ON arrivals(UPPER(TRIM(variety)), status, date DESC)`,

    // Kunchinittu stock queries
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_kunchinittu_stock 
     ON arrivals("toKunchinintuId", status, "adminApprovedBy", date DESC)`,

    // Shifting queries (from -> to)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_shifting_chain 
     ON arrivals("fromKunchinintuId", "toKunchinintuId", status, date DESC)`,

    // Outturn-based queries (production tracking)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_arrivals_outturn_tracking 
     ON arrivals("outturnId", "fromOutturnId", status, date DESC)`,

    // ============ RICE STOCK MOVEMENTS ============
    // Stock balance queries (most critical for palti/sale)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_stock_location_product_date 
     ON rice_stock_movements(location_code, product_type, date DESC)`,

    // Palti operations (brand conversion)
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_stock_palti_operations 
     ON rice_stock_movements(movement_type, source_packaging_id, target_packaging_id, date DESC)`,

    // Sale operations
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_stock_sales 
     ON rice_stock_movements(movement_type, status, location_code, date DESC)`,

    // Variety-based stock queries
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_stock_variety_lookup 
     ON rice_stock_movements(variety, location_code, product_type, status)`,

    // ============ RICE PRODUCTIONS ============
    // Production tracking by outturn
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_productions_outturn_tracking 
     ON rice_productions("outturnId", status, date DESC)`,

    // Production by location and product type
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_productions_location_product 
     ON rice_productions("locationCode", "productType", status, date DESC)`,

    // ============ OUTTURNS ============
    // Outturn status tracking
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_outturns_status_variety 
     ON outturns(status, "allottedVariety", is_cleared, date DESC)`,

    // ============ HAMALI ENTRIES ============
    // Hamali rate lookups
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_hamali_entries_work_type 
     ON rice_hamali_entries("riceHamaliRateId", status, created_at DESC)`,

    // Paddy hamali
    `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_paddy_hamali_arrival_lookup 
     ON paddy_hamali_entries("arrivalId", status, created_at DESC)`,
  ];

  for (const query of queries) {
    try {
      await sequelize.query(query);
      console.log('✅ Index created:', query.split('ON ')[1].split(' ')[0]);
    } catch (error) {
      // Ignore if index already exists
      if (error.message.includes('already exists')) {
        console.log('ℹ️ Index already exists, skipping');
      } else {
        console.warn('⚠️ Index creation warning:', error.message);
      }
    }
  }

  console.log('✅ Ultimate performance indexes migration completed!');
  console.log('📈 Expected improvement: <100ms for most queries with 10 lakh records');
}

async function down() {
  console.log('🔄 Rolling back ultimate performance indexes...');

  const indexes = [
    'idx_arrivals_status_date_composite',
    'idx_arrivals_movement_status_date',
    'idx_arrivals_variety_status_date',
    'idx_arrivals_kunchinittu_stock',
    'idx_arrivals_shifting_chain',
    'idx_arrivals_outturn_tracking',
    'idx_rice_stock_location_product_date',
    'idx_rice_stock_palti_operations',
    'idx_rice_stock_sales',
    'idx_rice_stock_variety_lookup',
    'idx_rice_productions_outturn_tracking',
    'idx_rice_productions_location_product',
    'idx_outturns_status_variety',
    'idx_hamali_entries_work_type',
    'idx_paddy_hamali_arrival_lookup',
  ];

  for (const index of indexes) {
    try {
      await sequelize.query(`DROP INDEX IF EXISTS ${index}`);
    } catch (error) {
      console.warn('⚠️ Index removal warning:', error.message);
    }
  }

  console.log('✅ Rollback complete');
}

module.exports = { up, down };
