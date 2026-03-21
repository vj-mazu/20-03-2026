/**
 * Rice Stock Backward Compatibility Middleware
 * 
 * Ensures existing rice stock functionality continues to work during
 * the transition from free-text varieties to outturn-based varieties.
 * 
 * This middleware ONLY affects rice stock operations (Purchase, Sale, Palti).
 * It does NOT modify arrivals, hamali, location, or other systems.
 * 
 * Requirements: 7.1, 7.2, 7.4
 */

const { sequelize } = require('../config/database');

class RiceStockBackwardCompatibilityLayer {
  
  /**
   * Middleware to handle backward compatibility for rice stock requests
   */
  static handleRiceStockCompatibility() {
    return async (req, res, next) => {
      try {
        // Only apply to rice stock related endpoints
        if (!this.isRiceStockEndpoint(req.path)) {
          return next();
        }

        console.log(`🔄 Applying backward compatibility for: ${req.method} ${req.path}`);

        // Enhance request with compatibility helpers
        req.riceStockCompat = {
          normalizeVariety: this.normalizeVariety.bind(this),
          findOutturnByVariety: this.findOutturnByVariety.bind(this),
          ensureVarietyCompatibility: this.ensureVarietyCompatibility.bind(this),
          transformLegacyData: this.transformLegacyData.bind(this)
        };

        // Handle POST/PUT requests with variety data
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
          req.body = await this.transformIncomingData(req.body);
        }

        // Intercept response to transform outgoing data
        const originalSend = res.send;
        res.send = function(data) {
          if (typeof data === 'string') {
            try {
              const parsedData = JSON.parse(data);
              const transformedData = RiceStockBackwardCompatibilityLayer.transformOutgoingData(parsedData, req.path);
              return originalSend.call(this, JSON.stringify(transformedData));
            } catch (e) {
              // If not JSON, send as-is
              return originalSend.call(this, data);
            }
          }
          return originalSend.call(this, data);
        };

        next();

      } catch (error) {
        console.error('❌ Backward compatibility middleware error:', error);
        next(error);
      }
    };
  }

  /**
   * Check if the endpoint is rice stock related
   */
  static isRiceStockEndpoint(path) {
    const riceStockPaths = [
      '/api/rice-stock',
      '/api/rice-stock/',
      '/api/rice-stock/varieties',
      '/api/rice-stock/movements',
      '/api/rice-stock/purchase',
      '/api/rice-stock/sale',
      '/api/rice-stock/palti'
    ];

    return riceStockPaths.some(stockPath => path.startsWith(stockPath));
  }

  /**
   * Transform incoming request data for backward compatibility
   */
  static async transformIncomingData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const transformed = { ...data };

    // Handle variety field in rice stock operations
    if (transformed.variety && !transformed.outturnId) {
      try {
        const outturnMatch = await this.findOutturnByVariety(transformed.variety);
        if (outturnMatch) {
          transformed.outturnId = outturnMatch.id;
          transformed._originalVariety = transformed.variety; // Preserve original for logging
          console.log(`🔄 Mapped variety "${transformed.variety}" to outturn ${outturnMatch.id}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not map variety "${transformed.variety}" to outturn:`, error.message);
        // Continue with original variety for backward compatibility
      }
    }

    // Handle arrays of rice stock data
    if (Array.isArray(transformed.items)) {
      transformed.items = await Promise.all(
        transformed.items.map(item => this.transformIncomingData(item))
      );
    }

    return transformed;
  }

  /**
   * Transform outgoing response data for backward compatibility
   */
  static transformOutgoingData(data, requestPath) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    // Handle rice stock report data
    if (data.riceStock && Array.isArray(data.riceStock)) {
      data.riceStock = data.riceStock.map(dayData => ({
        ...dayData,
        openingStock: this.transformStockItems(dayData.openingStock),
        productions: this.transformStockItems(dayData.productions),
        closingStock: this.transformStockItems(dayData.closingStock)
      }));
    }

    // Handle rice stock varieties data
    if (data.varieties && Array.isArray(data.varieties)) {
      data.varieties = data.varieties.map(variety => ({
        ...variety,
        // Ensure backward compatibility fields are present
        variety: variety.standardizedVariety || variety.variety,
        displayName: variety.standardizedVariety || variety.variety,
        isLegacy: !variety.outturnId,
        migrationStatus: variety.outturnId ? 'migrated' : 'legacy'
      }));
    }

    // Handle single rice stock movement
    if (data.movement) {
      data.movement = this.transformStockItem(data.movement);
    }

    return data;
  }

  /**
   * Transform array of stock items for backward compatibility
   */
  static transformStockItems(items) {
    if (!Array.isArray(items)) {
      return items;
    }

    return items.map(item => this.transformStockItem(item));
  }

  /**
   * Transform individual stock item for backward compatibility
   */
  static transformStockItem(item) {
    if (!item || typeof item !== 'object') {
      return item;
    }

    return {
      ...item,
      // Ensure variety field is always present for legacy clients
      variety: item.variety || item.standardizedVariety || 'Unknown',
      // Add compatibility flags
      hasOutturn: !!item.outturnId,
      varietySource: item.varietySource || (item.outturnId ? 'outturn-based' : 'legacy'),
      // Preserve original outturn information
      outturnInfo: item.outturnId ? {
        id: item.outturnId,
        code: item.outturnCode,
        standardizedVariety: item.variety
      } : null
    };
  }

  /**
   * Normalize variety string for consistent comparison
   */
  static normalizeVariety(variety) {
    if (!variety) return '';
    return variety.toString().trim().toUpperCase();
  }

  /**
   * Find outturn by variety string using fuzzy matching
   */
  static async findOutturnByVariety(variety) {
    if (!variety) return null;

    const normalizedVariety = this.normalizeVariety(variety);

    try {
      // First try exact match
      const [exactMatches] = await sequelize.query(`
        SELECT id, code, allotted_variety, type,
               UPPER(TRIM(CONCAT(allotted_variety, ' ', COALESCE(type, '')))) as standardized_variety
        FROM outturns 
        WHERE UPPER(TRIM(CONCAT(allotted_variety, ' ', COALESCE(type, '')))) = $1
        LIMIT 1
      `, {
        replacements: [normalizedVariety]
      });

      if (exactMatches.length > 0) {
        return exactMatches[0];
      }

      // Try partial match on allotted_variety
      const [partialMatches] = await sequelize.query(`
        SELECT id, code, allotted_variety, type,
               UPPER(TRIM(CONCAT(allotted_variety, ' ', COALESCE(type, '')))) as standardized_variety
        FROM outturns 
        WHERE UPPER(TRIM(allotted_variety)) = $1
           OR $1 LIKE '%' || UPPER(TRIM(allotted_variety)) || '%'
        ORDER BY LENGTH(allotted_variety) DESC
        LIMIT 1
      `, {
        replacements: [normalizedVariety]
      });

      if (partialMatches.length > 0) {
        return partialMatches[0];
      }

      return null;

    } catch (error) {
      console.error('❌ Error finding outturn by variety:', error);
      return null;
    }
  }

  /**
   * Ensure variety compatibility during transition
   */
  static async ensureVarietyCompatibility(riceStockData) {
    if (!riceStockData || typeof riceStockData !== 'object') {
      return riceStockData;
    }

    const enhanced = { ...riceStockData };

    // Ensure both variety string and outturn ID are available when possible
    if (enhanced.outturnId && !enhanced.variety) {
      try {
        const [outturnData] = await sequelize.query(`
          SELECT UPPER(TRIM(CONCAT(allotted_variety, ' ', COALESCE(type, '')))) as standardized_variety
          FROM outturns 
          WHERE id = $1
        `, {
          replacements: [enhanced.outturnId]
        });

        if (outturnData.length > 0) {
          enhanced.variety = outturnData[0].standardized_variety;
          enhanced._varietyFromOutturn = true;
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch variety for outturn ${enhanced.outturnId}:`, error.message);
      }
    }

    // Ensure outturn ID when variety is provided (best effort)
    if (enhanced.variety && !enhanced.outturnId) {
      const outturnMatch = await this.findOutturnByVariety(enhanced.variety);
      if (outturnMatch) {
        enhanced.outturnId = outturnMatch.id;
        enhanced._outturnFromVariety = true;
      }
    }

    return enhanced;
  }

  /**
   * Transform legacy data format to new format
   */
  static transformLegacyData(legacyData) {
    if (!legacyData || typeof legacyData !== 'object') {
      return legacyData;
    }

    const transformed = { ...legacyData };

    // Handle legacy field mappings
    const fieldMappings = {
      'varietyName': 'variety',
      'varietyType': 'variety',
      'riceVariety': 'variety',
      'productVariety': 'variety'
    };

    Object.entries(fieldMappings).forEach(([oldField, newField]) => {
      if (transformed[oldField] && !transformed[newField]) {
        transformed[newField] = transformed[oldField];
        transformed[`_legacy_${oldField}`] = transformed[oldField]; // Preserve original
      }
    });

    // Add compatibility metadata
    transformed._isLegacyData = true;
    transformed._transformedAt = new Date().toISOString();

    return transformed;
  }

  /**
   * Validate rice stock data compatibility
   */
  static validateCompatibility(data) {
    const issues = [];

    if (!data || typeof data !== 'object') {
      return { isValid: true, issues: [] };
    }

    // Check for required fields
    if (!data.variety && !data.outturnId) {
      issues.push('Either variety or outturnId must be provided');
    }

    // Check for data consistency
    if (data.variety && data.outturnId) {
      // Both are provided - this is ideal for transition period
      console.log('✅ Both variety and outturnId provided - optimal compatibility');
    }

    // Check for legacy field usage
    const legacyFields = ['varietyName', 'varietyType', 'riceVariety', 'productVariety'];
    const usedLegacyFields = legacyFields.filter(field => data[field]);
    
    if (usedLegacyFields.length > 0) {
      issues.push(`Legacy fields detected: ${usedLegacyFields.join(', ')}. Consider updating to use 'variety' field.`);
    }

    return {
      isValid: issues.length === 0,
      issues,
      hasLegacyFields: usedLegacyFields.length > 0,
      hasModernFields: !!(data.variety || data.outturnId)
    };
  }

  /**
   * Get compatibility status for rice stock system
   */
  static async getCompatibilityStatus() {
    try {
      const [stats] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_records,
          COUNT(CASE WHEN outturn_id IS NOT NULL THEN 1 END) as outturn_based,
          COUNT(CASE WHEN outturn_id IS NULL AND variety IS NOT NULL THEN 1 END) as string_based,
          COUNT(CASE WHEN outturn_id IS NULL AND variety IS NULL THEN 1 END) as missing_variety
        FROM rice_stock_movements 
        WHERE status = 'approved'
      `);

      const totalRecords = parseInt(stats[0].total_records);
      const outturnBased = parseInt(stats[0].outturn_based);
      const stringBased = parseInt(stats[0].string_based);
      const missingVariety = parseInt(stats[0].missing_variety);

      const migrationProgress = totalRecords > 0 ? (outturnBased / totalRecords) * 100 : 0;

      return {
        totalRecords,
        outturnBased,
        stringBased,
        missingVariety,
        migrationProgress: migrationProgress.toFixed(2),
        isFullyMigrated: migrationProgress === 100,
        needsCompatibilityLayer: stringBased > 0 || missingVariety > 0,
        status: migrationProgress === 100 ? 'completed' : 
                migrationProgress > 0 ? 'in_progress' : 'not_started'
      };

    } catch (error) {
      console.error('❌ Error getting compatibility status:', error);
      return {
        error: error.message,
        status: 'unknown'
      };
    }
  }
}

module.exports = RiceStockBackwardCompatibilityLayer;