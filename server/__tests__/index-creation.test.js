/**
 * Unit Tests for Database Index Creation
 * Validates: Requirements 2.1
 */

const { sequelize } = require('../config/database');
const migration65 = require('../migrations/65_add_comprehensive_performance_indexes');

describe('Database Index Creation', () => {
  /**
   * Test that all required indexes are created successfully
   */
  describe('Index Creation', () => {
    test('should create all required indexes without errors', async () => {
      // Run the migration
      await expect(migration65.up()).resolves.not.toThrow();
    });

    test('should create arrivals table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('arrivals');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_arrivals_status_date');
      expect(indexNames).toContain('idx_arrivals_status');
      expect(indexNames).toContain('idx_arrivals_date');
      expect(indexNames).toContain('idx_arrivals_location');
    });

    test('should create kunchinittus (stock) table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('kunchinittus');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_kunchinittus_location_variety');
      expect(indexNames).toContain('idx_kunchinittus_created_at');
      expect(indexNames).toContain('idx_kunchinittus_status');
    });

    test('should create rice_productions table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('rice_productions');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_rice_productions_date');
      expect(indexNames).toContain('idx_rice_productions_variety');
      expect(indexNames).toContain('idx_rice_productions_location');
    });

    test('should create hamali_entries table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('hamali_entries');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_hamali_entries_date');
      expect(indexNames).toContain('idx_hamali_entries_location');
    });

    test('should create rice_stock_movements table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('rice_stock_movements');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_rice_stock_movements_date');
      expect(indexNames).toContain('idx_rice_stock_movements_from_location');
      expect(indexNames).toContain('idx_rice_stock_movements_to_location');
    });

    test('should create packagings table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('packagings');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_packagings_date');
      expect(indexNames).toContain('idx_packagings_location');
    });

    test('should create outturns table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('outturns');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_outturns_date');
      expect(indexNames).toContain('idx_outturns_location');
    });

    test('should create locations table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('locations');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_locations_active');
    });

    test('should create varieties table indexes', async () => {
      const indexes = await sequelize.getQueryInterface().showIndex('varieties');
      const indexNames = indexes.map(idx => idx.name);

      expect(indexNames).toContain('idx_varieties_active');
    });
  });

  /**
   * Test IF NOT EXISTS behavior (no errors on re-run)
   */
  describe('IF NOT EXISTS Behavior', () => {
    test('should not throw errors when running migration multiple times', async () => {
      // Run migration first time
      await expect(migration65.up()).resolves.not.toThrow();
      
      // Run migration second time - should not throw errors
      await expect(migration65.up()).resolves.not.toThrow();
      
      // Run migration third time - should still not throw errors
      await expect(migration65.up()).resolves.not.toThrow();
    });

    test('should skip existing indexes gracefully', async () => {
      // Get initial index count
      const initialIndexes = await sequelize.getQueryInterface().showIndex('arrivals');
      const initialCount = initialIndexes.length;

      // Run migration again
      await migration65.up();

      // Get final index count
      const finalIndexes = await sequelize.getQueryInterface().showIndex('arrivals');
      const finalCount = finalIndexes.length;

      // Count should be the same (no duplicates created)
      expect(finalCount).toBe(initialCount);
    });
  });

  /**
   * Test that indexes improve query performance
   */
  describe('Index Performance Impact', () => {
    test('should use indexes for arrivals status queries', async () => {
      const [results] = await sequelize.query(
        `EXPLAIN SELECT * FROM arrivals WHERE status = 'pending' ORDER BY arrival_date DESC LIMIT 100`
      );

      // Check that the query plan uses an index
      const planText = JSON.stringify(results);
      expect(planText.toLowerCase()).toMatch(/index|idx_arrivals/);
    });

    test('should use indexes for stock location queries', async () => {
      const [results] = await sequelize.query(
        `EXPLAIN SELECT * FROM kunchinittus WHERE location_id = 1 AND variety_id = 1`
      );

      // Check that the query plan uses an index
      const planText = JSON.stringify(results);
      expect(planText.toLowerCase()).toMatch(/index|idx_kunchinittus/);
    });

    test('should use indexes for date range queries', async () => {
      const [results] = await sequelize.query(
        `EXPLAIN SELECT * FROM rice_productions WHERE production_date >= '2024-01-01' AND production_date <= '2024-12-31'`
      );

      // Check that the query plan uses an index
      const planText = JSON.stringify(results);
      expect(planText.toLowerCase()).toMatch(/index|idx_rice_productions/);
    });
  });
});
