/**
 * Location Stock Query Engine - Optimized SQL queries for location-specific stock calculations
 * 
 * Provides high-performance database queries and caching for location-variety-packaging combinations.
 * Creates database views and implements proper indexing for efficient querying.
 * 
 * Requirements: 1.5, 3.6, 10.1, 10.2
 */

const { sequelize } = require('../config/database');
const cacheService = require('./cacheService');

class LocationStockQueryEngine {
  /**
   * Initialize the query engine with database views and indexes
   */
  static async initialize() {
    console.log('🚀 Initializing Location Stock Query Engine...');
    
    try {
      await this._createLocationStockView();
      await this._createOptimizedIndexes();
      console.log('✅ Location Stock Query Engine initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Location Stock Query Engine:', error);
      throw error;
    }
  }

  /**
   * Get optimized location stock breakdown with caching
   */
  static async getOptimizedLocationStock(params) {
    const { 
      variety, 
      outturnId, 
      productType = 'Rice',
      packagingId,
      packagingBrand,
      bagSizeKg,
      date = new Date().toISOString().split('T')[0],
      useCache = true,
      debugMode = false 
    } = params;

    // Generate cache key
    const cacheKey = `location-stock:${variety || 'all'}:${outturnId || 'none'}:${productType}:${packagingId || 'none'}:${packagingBrand || 'none'}:${bagSizeKg || 'none'}:${date}`;

    if (useCache) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        if (debugMode) {
          console.log('📦 Retrieved from cache:', cacheKey);
        }
        return { ...cached, fromCache: true };
      }
    }

    if (debugMode) {
      console.log('🔍 Executing optimized location stock query:', params);
    }

    try {
      const startTime = Date.now();

      // Use optimized view for faster queries
      const query = `
        SELECT 
          location_code,
          location_name,
          is_direct_load,
          complete_variety_text,
          product_type,
          packaging_name,
          bag_size_kg,
          available_bags,
          available_qtls,
          total_palti_operations,
          last_movement_date,
          grouping_key
        FROM location_stock_bifurcation_view
        WHERE calculation_date <= :date
          AND product_type = :productType
          ${variety ? 'AND LOWER(TRIM(REGEXP_REPLACE(complete_variety_text, \'[_\\s-]+\', \' \', \'g\'))) LIKE LOWER(:varietyPattern)' : ''}
          ${outturnId ? 'AND outturn_id = :outturnId' : ''}
          ${packagingBrand ? 'AND LOWER(packaging_name) = LOWER(:packagingBrand)' : ''}
          ${bagSizeKg ? 'AND bag_size_kg = :bagSizeKg' : ''}
          AND (available_bags > 0 OR available_qtls > 0)
        ORDER BY 
          location_code ASC,
          available_bags DESC
      `;

      const replacements = {
        date,
        productType
      };

      if (variety) {
        replacements.varietyPattern = `%${variety.toLowerCase()}%`;
      }
      if (outturnId) {
        replacements.outturnId = outturnId;
      }
      if (packagingBrand) {
        replacements.packagingBrand = packagingBrand;
      }
      if (bagSizeKg) {
        replacements.bagSizeKg = bagSizeKg;
      }

      const result = await sequelize.query(query, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      const queryTime = Date.now() - startTime;

      // Format results
      const locationBreakdown = result.map(row => ({
        locationCode: row.location_code,
        locationName: row.location_name || row.location_code,
        isDirectLoad: Boolean(row.is_direct_load),
        completeVarietyText: row.complete_variety_text,
        productType: row.product_type,
        packagingName: row.packaging_name || 'Unknown',
        bagSizeKg: row.bag_size_kg || 26,
        availableBags: Math.max(0, parseInt(row.available_bags || 0)),
        availableQtls: Math.max(0, parseFloat(row.available_qtls || 0)),
        totalPaltiOperations: parseInt(row.total_palti_operations || 0),
        lastMovementDate: row.last_movement_date,
        groupingKey: row.grouping_key
      }));

      // Calculate totals
      const totals = {
        totalBags: locationBreakdown.reduce((sum, item) => sum + item.availableBags, 0),
        totalQtls: locationBreakdown.reduce((sum, item) => sum + item.availableQtls, 0),
        uniqueLocations: locationBreakdown.length,
        directLoadLocations: locationBreakdown.filter(item => item.isDirectLoad).length,
        regularLocations: locationBreakdown.filter(item => !item.isDirectLoad).length
      };

      const optimizedResult = {
        variety: variety || 'All',
        outturnId,
        productType,
        date,
        locationBreakdown,
        totals,
        performance: {
          queryTime: `${queryTime}ms`,
          recordCount: result.length,
          fromCache: false
        },
        debugInfo: debugMode ? {
          query,
          replacements,
          cacheKey
        } : undefined
      };

      // Cache for 5 minutes (300 seconds)
      if (useCache) {
        await cacheService.set(cacheKey, optimizedResult, 300);
      }

      if (debugMode) {
        console.log('🚀 Optimized query completed:', {
          queryTime: `${queryTime}ms`,
          recordCount: result.length,
          cacheKey
        });
      }

      return optimizedResult;

    } catch (error) {
      console.error('❌ Error in optimized location stock query:', error);
      throw error;
    }
  }

  /**
   * Get frequently accessed location-variety-packaging combinations
   */
  static async getFrequentCombinations(limit = 50) {
    try {
      const query = `
        SELECT 
          location_code,
          complete_variety_text,
          packaging_name,
          bag_size_kg,
          COUNT(*) as access_count,
          MAX(last_movement_date) as last_accessed
        FROM location_stock_bifurcation_view
        WHERE total_palti_operations > 0
        GROUP BY location_code, complete_variety_text, packaging_name, bag_size_kg
        ORDER BY access_count DESC, last_accessed DESC
        LIMIT :limit
      `;

      const result = await sequelize.query(query, {
        replacements: { limit },
        type: sequelize.QueryTypes.SELECT
      });

      return result.map(row => ({
        locationCode: row.location_code,
        completeVarietyText: row.complete_variety_text,
        packagingName: row.packaging_name,
        bagSizeKg: row.bag_size_kg,
        accessCount: parseInt(row.access_count),
        lastAccessed: row.last_accessed,
        cacheKey: `location-stock:${row.complete_variety_text}:none:Rice:none:${row.packaging_name}:${row.bag_size_kg}:${new Date().toISOString().split('T')[0]}`
      }));

    } catch (error) {
      console.error('❌ Error getting frequent combinations:', error);
      throw error;
    }
  }

  /**
   * Preload cache for frequent combinations
   */
  static async preloadFrequentCombinations() {
    console.log('🔄 Preloading cache for frequent combinations...');
    
    try {
      const frequentCombinations = await this.getFrequentCombinations(20);
      
      for (const combo of frequentCombinations) {
        await this.getOptimizedLocationStock({
          variety: combo.completeVarietyText,
          productType: 'Rice',
          packagingBrand: combo.packagingName,
          bagSizeKg: combo.bagSizeKg,
          useCache: true
        });
      }

      console.log(`✅ Preloaded cache for ${frequentCombinations.length} frequent combinations`);
    } catch (error) {
      console.error('❌ Error preloading cache:', error);
    }
  }

  /**
   * Clear location stock cache
   */
  static async clearCache(pattern = 'location-stock:*') {
    try {
      await cacheService.deletePattern(pattern);
      console.log(`🗑️ Cleared cache pattern: ${pattern}`);
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Create optimized database view for location stock bifurcation
   */
  static async _createLocationStockView() {
    console.log('📊 Creating location_stock_bifurcation_view...');

    const viewQuery = `
      CREATE OR REPLACE VIEW location_stock_bifurcation_view AS
      WITH location_stock_calculation AS (
        -- Rice Stock Movements with location details
        SELECT 
          rsm.location_code,
          rsl.name as location_name,
          rsl.is_direct_load,
          rsm.variety as complete_variety_text,
          rsm.outturn_id,
          rsm.product_type,
          p."brandName" as packaging_name,
          p."allottedKg" as bag_size_kg,
          rsm.date as calculation_date,
          SUM(CASE 
            WHEN rsm.movement_type IN ('purchase', 'production') THEN rsm.bags
            WHEN rsm.movement_type = 'sale' THEN -rsm.bags
            WHEN rsm.movement_type = 'palti' AND rsm.source_packaging_id = rsm.packaging_id THEN -rsm.bags
            WHEN rsm.movement_type = 'palti' AND rsm.target_packaging_id = rsm.packaging_id THEN rsm.bags
            ELSE 0
          END) as movement_bags,
          SUM(CASE 
            WHEN rsm.movement_type IN ('purchase', 'production') THEN rsm.quantity_quintals
            WHEN rsm.movement_type = 'sale' THEN -rsm.quantity_quintals
            WHEN rsm.movement_type = 'palti' AND rsm.source_packaging_id = rsm.packaging_id THEN -rsm.quantity_quintals
            WHEN rsm.movement_type = 'palti' AND rsm.target_packaging_id = rsm.packaging_id THEN rsm.quantity_quintals
            ELSE 0
          END) as movement_qtls,
          COUNT(DISTINCT CASE WHEN rsm.movement_type = 'palti' THEN rsm.date END) as palti_count,
          MAX(rsm.date) as last_movement_date
        FROM rice_stock_movements rsm
        LEFT JOIN packagings p ON rsm.packaging_id = p.id
        LEFT JOIN rice_stock_locations rsl ON LOWER(REPLACE(rsm.location_code, '_', ' ')) = LOWER(REPLACE(rsl.code, '_', ' '))
        WHERE rsm.status = 'approved'
        GROUP BY 
          rsm.location_code,
          rsl.name,
          rsl.is_direct_load,
          rsm.variety,
          rsm.outturn_id,
          rsm.product_type,
          p."brandName",
          p."allottedKg",
          rsm.date
        
        UNION ALL
        
        -- Rice Productions with location details (outturn-based)
        SELECT 
          rp."locationCode" as location_code,
          rsl.name as location_name,
          rsl.is_direct_load,
          UPPER(o."allottedVariety" || ' ' || o.type) as complete_variety_text,
          rp."outturnId" as outturn_id,
          rp."productType" as product_type,
          p."brandName" as packaging_name,
          p."allottedKg" as bag_size_kg,
          rp.date as calculation_date,
          SUM(rp.bags) as movement_bags,
          SUM(rp."quantityQuintals") as movement_qtls,
          0 as palti_count,
          MAX(rp.date) as last_movement_date
        FROM rice_productions rp
        JOIN outturns o ON rp."outturnId" = o.id
        LEFT JOIN packagings p ON rp."packagingId" = p.id
        LEFT JOIN rice_stock_locations rsl ON LOWER(REPLACE(rp."locationCode", '_', ' ')) = LOWER(REPLACE(rsl.code, '_', ' '))
        WHERE rp.status = 'approved'
        GROUP BY 
          rp."locationCode",
          rsl.name,
          rsl.is_direct_load,
          o."allottedVariety",
          o.type,
          rp."outturnId",
          rp."productType",
          p."brandName",
          p."allottedKg",
          rp.date
      )
      SELECT 
        location_code,
        location_name,
        is_direct_load,
        complete_variety_text,
        outturn_id,
        product_type,
        packaging_name,
        bag_size_kg,
        calculation_date,
        SUM(movement_bags) as available_bags,
        SUM(movement_qtls) as available_qtls,
        SUM(palti_count) as total_palti_operations,
        MAX(last_movement_date) as last_movement_date,
        CONCAT(location_code, '|', complete_variety_text, '|', product_type, '|', packaging_name, '|', bag_size_kg, 'kg') as grouping_key
      FROM location_stock_calculation
      GROUP BY 
        location_code,
        location_name,
        is_direct_load,
        complete_variety_text,
        outturn_id,
        product_type,
        packaging_name,
        bag_size_kg,
        calculation_date
      HAVING SUM(movement_bags) > 0 OR SUM(movement_qtls) > 0
    `;

    await sequelize.query(viewQuery);
    console.log('✅ Created location_stock_bifurcation_view');
  }

  /**
   * Create optimized indexes for performance
   */
  static async _createOptimizedIndexes() {
    console.log('🔧 Creating optimized indexes...');

    const indexes = [
      // Index for location-variety-packaging queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_stock_movements_location_variety_packaging 
       ON rice_stock_movements (location_code, variety, product_type, packaging_id, date) 
       WHERE status = 'approved'`,
      
      // Index for outturn-based queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_stock_movements_outturn_location 
       ON rice_stock_movements (outturn_id, location_code, date) 
       WHERE status = 'approved' AND outturn_id IS NOT NULL`,
      
      // Index for rice productions location queries
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_productions_location_outturn 
       ON rice_productions ("locationCode", "outturnId", date) 
       WHERE status = 'approved'`,
      
      // Index for packaging lookups
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_packagings_brand_size 
       ON packagings ("brandName", "allottedKg")`,
      
      // Index for rice stock locations
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rice_stock_locations_code_direct_load 
       ON rice_stock_locations (LOWER(REPLACE(code, '_', ' ')), is_direct_load)`
    ];

    for (const indexQuery of indexes) {
      try {
        await sequelize.query(indexQuery);
        console.log('✅ Created index:', indexQuery.split('idx_')[1]?.split(' ')[0]);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️ Index already exists:', indexQuery.split('idx_')[1]?.split(' ')[0]);
        } else {
          console.error('❌ Error creating index:', error.message);
        }
      }
    }

    console.log('✅ Optimized indexes created');
  }
}

module.exports = LocationStockQueryEngine;