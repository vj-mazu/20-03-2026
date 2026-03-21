const { sequelize } = require('../config/database');

/**
 * Migration: Add comprehensive indexes for performance optimization
 * 
 * This migration adds composite, covering, and partial indexes to optimize
 * query performance for 300K+ records
 */

module.exports = {
  up: async () => {
    const queryInterface = sequelize.getQueryInterface();
    
    try {
      console.log('🔄 Adding comprehensive performance indexes...');
      
      // Composite index for stock queries (status + adminApprovedBy + date)
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_status_admin_date 
        ON arrivals(status, "adminApprovedBy", date DESC)
        WHERE status = 'approved' AND "adminApprovedBy" IS NOT NULL;
      `);
      console.log('✅ Added idx_arrivals_status_admin_date');
      
      // Composite index for production queries (movementType + outturnId + status)
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_movement_outturn_status 
        ON arrivals("movementType", "outturnId", status)
        WHERE "outturnId" IS NOT NULL;
      `);
      console.log('✅ Added idx_arrivals_movement_outturn_status');
      
      // Composite index for variety-based queries (variety + status + date)
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_variety_status_date 
        ON arrivals(UPPER(TRIM(variety)), status, date DESC)
        WHERE variety IS NOT NULL;
      `);
      console.log('✅ Added idx_arrivals_variety_status_date');
      
      // Composite index for kunchinittu queries (toKunchinintuId + status + movementType)
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_kunchinittu_status_movement 
        ON arrivals("toKunchinintuId", status, "movementType")
        WHERE "toKunchinintuId" IS NOT NULL;
      `);
      console.log('✅ Added idx_arrivals_kunchinittu_status_movement');
      
      // Covering index for pagination with included columns
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_date_id_covering 
        ON arrivals(date DESC, id DESC) 
        INCLUDE (bags, "netWeight", variety, "movementType", status);
      `);
      console.log('✅ Added idx_arrivals_date_id_covering');
      
      // Partial index for approved records with admin approval (most common query)
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_approved_admin 
        ON arrivals(status, "adminApprovedBy", date DESC) 
        WHERE status = 'approved' AND "adminApprovedBy" IS NOT NULL;
      `);
      console.log('✅ Added idx_arrivals_approved_admin');
      
      // Composite index for from kunchinittu queries
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_from_kunchinittu_status_movement 
        ON arrivals("fromKunchinintuId", status, "movementType")
        WHERE "fromKunchinintuId" IS NOT NULL;
      `);
      console.log('✅ Added idx_arrivals_from_kunchinittu_status_movement');
      
      // Composite index for warehouse queries
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_warehouse_status 
        ON arrivals("toWarehouseId", status, date DESC)
        WHERE "toWarehouseId" IS NOT NULL;
      `);
      console.log('✅ Added idx_arrivals_warehouse_status');
      
      // Composite index for variety + kunchinittu stock calculations
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_variety_kunchinittu_stock 
        ON arrivals(UPPER(TRIM(variety)), "toKunchinintuId", status, "adminApprovedBy")
        WHERE variety IS NOT NULL AND "toKunchinintuId" IS NOT NULL;
      `);
      console.log('✅ Added idx_arrivals_variety_kunchinittu_stock');
      
      // Composite index for created by + status (for staff queries)
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_arrivals_created_status_date 
        ON arrivals("createdBy", status, date DESC);
      `);
      console.log('✅ Added idx_arrivals_created_status_date');
      
      console.log('✅ All comprehensive indexes added successfully');
      
    } catch (error) {
      console.error('❌ Error adding comprehensive indexes:', error.message);
      throw error;
    }
  },
  
  down: async () => {
    const queryInterface = sequelize.getQueryInterface();
    
    try {
      console.log('🔄 Removing comprehensive performance indexes...');
      
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_status_admin_date;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_movement_outturn_status;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_variety_status_date;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_kunchinittu_status_movement;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_date_id_covering;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_approved_admin;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_from_kunchinittu_status_movement;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_warehouse_status;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_variety_kunchinittu_stock;');
      await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_arrivals_created_status_date;');
      
      console.log('✅ All comprehensive indexes removed successfully');
      
    } catch (error) {
      console.error('❌ Error removing comprehensive indexes:', error.message);
      throw error;
    }
  }
};
