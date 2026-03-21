/**
 * Rice Stock Calculation Service - Enhanced with Perfect Variety-wise Bifurcation
 * 
 * Updated to support perfect stock grouping by ALL dimensions:
 * - location + complete_variety_text + product_type + packaging_name + bag_size
 * 
 * This service ONLY affects rice stock operations (Purchase, Sale, Palti).
 * It does NOT modify arrivals stock calculations or warehouse calculations.
 * 
 * Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2, 5.1, 5.2
 */

const { sequelize } = require('../config/database');

class RiceStockCalculationService {
  /**
   * Calculate stock balance with perfect variety-wise bifurcation
   * Groups by: location + complete_variety_text + product_type + packaging_name + bag_size
   * Supports both outturn-based varieties and legacy string varieties
   */
  static async calculateStockBalance(params) {
    const {
      productType,
      packagingId,
      packagingBrand,
      bagSizeKg,
      locationCode,
      variety,
      outturnId,
      date,
      debugMode = false
    } = params;

    if (debugMode) {
      console.log('🔍 Perfect Stock Calculation with Complete Bifurcation:', {
        locationCode,
        variety,
        productType,
        packagingBrand,
        bagSizeKg,
        packagingId,
        outturnId,
        date
      });
    }

    try {
      // Resolve packaging information for perfect grouping
      const packagingInfo = await this._resolvePackagingInfo(packagingId, packagingBrand, bagSizeKg);

      if (debugMode) {
        console.log('📦 Resolved Packaging Info:', packagingInfo);
      }

      // Build variety matching conditions
      const varietyConditions = this._buildEnhancedVarietyMatching(variety, outturnId);

      if (debugMode) {
        console.log('🎯 Variety Matching Conditions:', varietyConditions);
      }

      // Build perfect stock calculation query with complete bifurcation
      const stockQuery = `
        WITH perfect_stock_calculation AS (
          -- Rice Stock Movements with complete variety text
          SELECT 
            rsm.location_code,
            rsm.variety as complete_variety_text,
            rsm.product_type,
            COALESCE(
              CASE 
                WHEN rsm.movement_type = 'palti' AND rsm.from_location = rsm.location_code THEN sp."brandName"
                WHEN rsm.movement_type = 'palti' AND rsm.to_location = rsm.location_code THEN tp."brandName"
                ELSE p."brandName"
              END,
              p."brandName"
            ) as packaging_name,
            COALESCE(
              CASE 
                WHEN rsm.movement_type = 'palti' AND rsm.from_location = rsm.location_code THEN sp."allottedKg"
                WHEN rsm.movement_type = 'palti' AND rsm.to_location = rsm.location_code THEN tp."allottedKg"
                ELSE p."allottedKg"
              END,
              p."allottedKg"
            ) as bag_size_kg,
            SUM(CASE 
              WHEN rsm.movement_type IN ('purchase', 'production') THEN rsm.bags
              WHEN rsm.movement_type = 'sale' THEN -rsm.bags
              WHEN rsm.movement_type = 'palti' AND rsm.from_location = rsm.location_code THEN -COALESCE(rsm.source_bags, rsm.bags)
              WHEN rsm.movement_type = 'palti' AND rsm.to_location = rsm.location_code THEN rsm.bags
              ELSE 0
            END) as movement_bags,
            SUM(CASE 
              WHEN rsm.movement_type IN ('purchase', 'production') THEN rsm.quantity_quintals
              WHEN rsm.movement_type = 'sale' THEN -rsm.quantity_quintals
              WHEN rsm.movement_type = 'palti' AND rsm.from_location = rsm.location_code THEN -rsm.quantity_quintals
              WHEN rsm.movement_type = 'palti' AND rsm.to_location = rsm.location_code THEN rsm.quantity_quintals
              ELSE 0
            END) as movement_qtls
          FROM rice_stock_movements rsm
          LEFT JOIN packagings p ON rsm.packaging_id = p.id
          LEFT JOIN packagings sp ON rsm.source_packaging_id = sp.id
          LEFT JOIN packagings tp ON rsm.target_packaging_id = tp.id
          WHERE rsm.status = 'approved'
            AND rsm.date <= :date
            AND rsm.location_code = :locationCode
            AND rsm.product_type = :productType
            ${packagingInfo.brand && packagingInfo.sizeKg ? `
            AND (
              -- Match regular packaging
              (p."brandName" = :packagingBrand AND p."allottedKg" = :bagSizeKg)
              OR
              -- Match source packaging in palti
              (rsm.movement_type = 'palti' AND sp."brandName" = :packagingBrand AND sp."allottedKg" = :bagSizeKg)
              OR
              -- Match target packaging in palti
              (rsm.movement_type = 'palti' AND tp."brandName" = :packagingBrand AND tp."allottedKg" = :bagSizeKg)
            )` : ''}
            ${varietyConditions.condition !== '1=1' ? `AND ${varietyConditions.condition}` : ''}
          GROUP BY 
            rsm.location_code,
            rsm.variety,
            rsm.product_type,
            COALESCE(
              CASE 
                WHEN rsm.movement_type = 'palti' AND rsm.from_location = rsm.location_code THEN sp."brandName"
                WHEN rsm.movement_type = 'palti' AND rsm.to_location = rsm.location_code THEN tp."brandName"
                ELSE p."brandName"
              END,
              p."brandName"
            ),
            COALESCE(
              CASE 
                WHEN rsm.movement_type = 'palti' AND rsm.from_location = rsm.location_code THEN sp."allottedKg"
                WHEN rsm.movement_type = 'palti' AND rsm.to_location = rsm.location_code THEN tp."allottedKg"
                ELSE p."allottedKg"
              END,
              p."allottedKg"
            )
          
          UNION ALL
          
          -- Rice Productions with outturn complete variety text
          SELECT 
            rp."locationCode" as location_code,
            UPPER(o."allottedVariety" || ' ' || o.type) as complete_variety_text,
            rp."productType" as product_type,
            p."brandName" as packaging_name,
            p."allottedKg" as bag_size_kg,
            SUM(rp.bags) as movement_bags,
            SUM(rp."quantityQuintals") as movement_qtls
          FROM rice_productions rp
          JOIN outturns o ON rp."outturnId" = o.id
          LEFT JOIN packagings p ON rp."packagingId" = p.id
          WHERE rp.status = 'approved'
            AND rp.date <= :date
            AND rp."locationCode" = :locationCode
            AND rp."productType" = :productType
            ${packagingInfo.brand ? 'AND p."brandName" = :packagingBrand' : ''}
            ${packagingInfo.sizeKg ? 'AND p."allottedKg" = :bagSizeKg' : ''}
            ${varietyConditions.type === 'outturn' ? 'AND rp."outturnId" = :outturnId' : ''}
            ${varietyConditions.type === 'string' ? 'AND LOWER(TRIM(REGEXP_REPLACE(o."allottedVariety" || \' \' || o.type, \'[_\\s-]+\', \' \', \'g\'))) = ANY(ARRAY[:varietyAliases])' : ''}
          GROUP BY 
            rp."locationCode",
            o."allottedVariety",
            o.type,
            rp."productType",
            p."brandName",
            p."allottedKg"
        )
        SELECT 
          location_code,
          complete_variety_text,
          product_type,
          packaging_name,
          bag_size_kg,
          SUM(movement_bags) as total_bags,
          SUM(movement_qtls) as total_qtls
        FROM perfect_stock_calculation
        ${packagingInfo.brand || packagingInfo.sizeKg ?
          'GROUP BY location_code, complete_variety_text, product_type, packaging_name, bag_size_kg' :
          'GROUP BY location_code, complete_variety_text, product_type, packaging_name, bag_size_kg'
        }
        HAVING SUM(movement_bags) > 0 OR SUM(movement_qtls) > 0
        ORDER BY SUM(movement_bags) DESC, packaging_name
      `;

      // Build replacements
      const replacements = {
        locationCode,
        productType,
        date
      };

      if (packagingInfo.brand) {
        replacements.packagingBrand = packagingInfo.brand;
      }
      if (packagingInfo.sizeKg) {
        replacements.bagSizeKg = packagingInfo.sizeKg;
      }

      Object.assign(replacements, varietyConditions.replacements);

      if (debugMode) {
        console.log('🔍 Perfect Stock Query:', stockQuery);
        console.log('🔍 Query Replacements:', replacements);
      }

      const result = await sequelize.query(stockQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      if (debugMode) {
        console.log('🔍 Stock Query Results:', result);
      }

      // Handle multiple packaging results when no specific packaging requested
      let stockData;
      if (!packagingInfo.brand && !packagingInfo.sizeKg && result.length > 0) {
        // Aggregate across all packagings for the variety
        stockData = {
          total_bags: result.reduce((sum, row) => sum + Number.parseInt(row.total_bags || 0), 0),
          total_qtls: result.reduce((sum, row) => sum + Number.parseFloat(row.total_qtls || 0), 0),
          complete_variety_text: result[0].complete_variety_text,
          packaging_name: result[0].packaging_name, // Use the first/largest packaging
          bag_size_kg: result[0].bag_size_kg
        };

        if (debugMode) {
          console.log('📦 Aggregated across packagings:', {
            packagingBreakdown: result.map(r => ({
              packaging: r.packaging_name,
              bagSize: r.bag_size_kg,
              bags: r.total_bags,
              qtls: r.total_qtls
            })),
            totalBags: stockData.total_bags,
            totalQtls: stockData.total_qtls
          });
        }
      } else {
        // Use specific packaging result or first result
        stockData = result[0] || {
          total_bags: 0,
          total_qtls: 0
        };
      }

      const perfectStock = {
        locationCode,
        completeVarietyText: stockData.complete_variety_text || variety || 'Unknown',
        productType,
        packagingName: stockData.packaging_name || packagingInfo.brand || 'Unknown',
        bagSizeKg: stockData.bag_size_kg || packagingInfo.sizeKg || 26,
        availableBags: Math.max(0, Number.parseInt(stockData.total_bags || 0)),
        availableQtls: Math.max(0, Number.parseFloat(stockData.total_qtls || 0)),
        groupingKey: `${locationCode}|${stockData.complete_variety_text || variety}|${productType}|${stockData.packaging_name || packagingInfo.brand}|${stockData.bag_size_kg || packagingInfo.sizeKg}kg`,
        calculationMethod: outturnId ? 'outturn-based' : 'variety-string',
        debugInfo: debugMode ? {
          queryParameters: replacements,
          varietyMatching: varietyConditions,
          packagingResolution: packagingInfo,
          stockBreakdown: result
        } : undefined
      };

      if (debugMode) {
        console.log('🎯 Perfect Stock Result:', perfectStock);
      }

      return perfectStock;

    } catch (error) {
      console.error('❌ Error calculating perfect stock balance:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use calculateStockBalance instead
   */
  static async calculateAvailableStock(params) {
    console.warn('⚠️ calculateAvailableStock is deprecated, use calculateStockBalance instead');
    return this.calculateStockBalance(params);
  }

  /**
   * Get complete variety-wise bifurcation for a specific variety
   * Shows all stock splits by Location + Packaging + Bag Size for that variety only
   * This is the main feature for variety bifurcation display
   */
  static async getVarietyBifurcation(params) {
    const {
      variety,
      outturnId,
      productType = 'Rice',
      date = new Date().toISOString().split('T')[0],
      debugMode = false
    } = params;

    if (debugMode) {
      console.log('🎯 Getting variety bifurcation for:', {
        variety,
        outturnId,
        productType,
        date
      });
    }

    try {
      // Build variety matching conditions (exact matching for bifurcation)
      const varietyConditions = this._buildExactVarietyMatching(variety, outturnId);

      if (debugMode) {
        console.log('🎯 Exact Variety Matching:', varietyConditions);
      }

      // Build complete bifurcation query
      const bifurcationQuery = `
        WITH variety_movements AS (
          -- Rice Stock Movements for this specific variety
          SELECT 
            rsm.location_code,
            rsm.variety as complete_variety_text,
            rsm.product_type,
            p."brandName" as packaging_name,
            p."allottedKg" as bag_size_kg,
            rsm.date,
            rsm.movement_type,
            CASE 
              WHEN rsm.movement_type IN ('purchase', 'production') THEN rsm.bags
              WHEN rsm.movement_type = 'sale' THEN -rsm.bags
              WHEN rsm.movement_type = 'palti' AND rsm.from_location = rsm.location_code THEN -COALESCE(rsm.source_bags, rsm.bags)
              WHEN rsm.movement_type = 'palti' AND rsm.to_location = rsm.location_code THEN rsm.bags
              ELSE 0
            END as movement_bags,
            CASE 
              WHEN rsm.movement_type IN ('purchase', 'production') THEN rsm.quantity_quintals
              WHEN rsm.movement_type = 'sale' THEN -rsm.quantity_quintals
              WHEN rsm.movement_type = 'palti' AND rsm.from_location = rsm.location_code THEN -rsm.quantity_quintals
              WHEN rsm.movement_type = 'palti' AND rsm.to_location = rsm.location_code THEN rsm.quantity_quintals
              ELSE 0
            END as movement_qtls
          FROM rice_stock_movements rsm
          LEFT JOIN packagings p ON rsm.packaging_id = p.id
          WHERE rsm.status = 'approved'
            AND rsm.date <= :date
            AND rsm.product_type = :productType
            ${varietyConditions.condition !== '1=1' ? `AND ${varietyConditions.condition}` : ''}
          
          UNION ALL
          
          -- Rice Productions for this specific variety (outturn-based)
          SELECT 
            rp."locationCode" as location_code,
            UPPER(o."allottedVariety" || ' ' || o.type) as complete_variety_text,
            rp."productType" as product_type,
            p."brandName" as packaging_name,
            p."allottedKg" as bag_size_kg,
            rp.date,
            'production' as movement_type,
            rp.bags as movement_bags,
            rp."quantityQuintals" as movement_qtls
          FROM rice_productions rp
          JOIN outturns o ON rp."outturnId" = o.id
          LEFT JOIN packagings p ON rp."packagingId" = p.id
          WHERE rp.status = 'approved'
            AND rp.date <= :date
            AND rp."productType" = :productType
            ${varietyConditions.type === 'outturn' ? 'AND rp."outturnId" = :outturnId' : ''}
            ${varietyConditions.type === 'string' ? 'AND LOWER(TRIM(REGEXP_REPLACE(o."allottedVariety" || \' \' || o.type, \'[_\\s-]+\', \' \', \'g\'))) = ANY(ARRAY[:varietyAliases])' : ''}
        )
        SELECT 
          location_code,
          complete_variety_text,
          product_type,
          packaging_name,
          bag_size_kg,
          SUM(movement_bags) as total_bags,
          SUM(movement_qtls) as total_qtls,
          COUNT(DISTINCT CASE WHEN movement_type = 'palti' THEN date END) as palti_operations,
          MAX(date) as last_movement_date,
          STRING_AGG(DISTINCT movement_type, ', ' ORDER BY movement_type) as movement_types
        FROM variety_movements
        GROUP BY 
          location_code,
          complete_variety_text,
          product_type,
          packaging_name,
          bag_size_kg
        HAVING SUM(movement_bags) > 0 OR SUM(movement_qtls) > 0
        ORDER BY 
          location_code,
          packaging_name,
          bag_size_kg DESC
      `;

      // Build replacements
      const replacements = {
        productType,
        date
      };

      Object.assign(replacements, varietyConditions.replacements);

      if (debugMode) {
        console.log('🔍 Bifurcation Query:', bifurcationQuery);
        console.log('🔍 Query Replacements:', replacements);
      }

      const result = await sequelize.query(bifurcationQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      if (debugMode) {
        console.log('🔍 Bifurcation Results:', result);
      }

      // Format results for display
      const bifurcation = result.map(row => ({
        locationCode: row.location_code,
        completeVarietyText: row.complete_variety_text,
        productType: row.product_type,
        packagingName: row.packaging_name || 'Unknown',
        bagSizeKg: row.bag_size_kg || 26,
        availableBags: Math.max(0, Number.parseInt(row.total_bags || 0)),
        availableQtls: Math.max(0, Number.parseFloat(row.total_qtls || 0)),
        paltiOperations: Number.parseInt(row.palti_operations || 0),
        lastMovementDate: row.last_movement_date,
        movementTypes: row.movement_types,
        groupingKey: `${row.location_code}|${row.complete_variety_text}|${row.product_type}|${row.packaging_name}|${row.bag_size_kg}kg`
      }));

      // Calculate totals
      const totals = {
        totalBags: bifurcation.reduce((sum, item) => sum + item.availableBags, 0),
        totalQtls: bifurcation.reduce((sum, item) => sum + item.availableQtls, 0),
        uniqueLocations: [...new Set(bifurcation.map(item => item.locationCode))].length,
        uniquePackagings: [...new Set(bifurcation.map(item => item.packagingName))].length,
        totalPaltiOperations: bifurcation.reduce((sum, item) => sum + item.paltiOperations, 0)
      };

      const varietyBifurcationResult = {
        variety: variety || 'Unknown',
        outturnId,
        productType,
        date,
        bifurcation,
        totals,
        calculationMethod: outturnId ? 'outturn-based' : 'variety-string',
        debugInfo: debugMode ? {
          queryParameters: replacements,
          varietyMatching: varietyConditions
        } : undefined
      };

      if (debugMode) {
        console.log('🎯 Complete Variety Bifurcation:', varietyBifurcationResult);
      }

      return varietyBifurcationResult;

    } catch (error) {
      console.error('❌ Error getting variety bifurcation:', error);
      throw error;
    }
  }

  /**
   * Build exact variety matching (no cross-contamination between Raw/Steam)
   */
  static _buildExactVarietyMatching(variety, outturnId) {
    if (outturnId) {
      return {
        type: 'outturn',
        condition: 'rsm.outturn_id = :outturnId',
        replacements: { outturnId }
      };
    }

    if (!variety) {
      return {
        type: 'none',
        condition: '1=1',
        replacements: {}
      };
    }

    // For exact matching, use the variety as-is with minimal aliasing
    const exactAliases = [
      variety,
      variety.toLowerCase(),
      variety.toUpperCase(),
      this._toTitleCase(variety),
      this._normalize(variety)
    ];

    return {
      type: 'string',
      condition: 'LOWER(TRIM(REGEXP_REPLACE(rsm.variety, \'[_\\s-]+\', \' \', \'g\'))) = ANY(ARRAY[:varietyAliases])',
      replacements: { varietyAliases: exactAliases }
    };
  }
  static async validateStockAvailability(params) {
    const { productType, packagingId, locationCode, variety, outturnId, requestedQtls, date } = params;

    console.log('🔍 Validating stock availability:', {
      productType, packagingId, locationCode, variety, outturnId, requestedQtls
    });

    try {
      const stockInfo = await this.calculateStockBalance({
        productType, packagingId, locationCode, variety, outturnId, date
      });

      const isAvailable = stockInfo.availableQtls >= requestedQtls;
      const shortfall = isAvailable ? 0 : requestedQtls - stockInfo.availableQtls;

      return {
        isAvailable,
        availableQtls: stockInfo.availableQtls,
        availableBags: stockInfo.availableBags,
        requestedQtls,
        shortfall,
        calculationMethod: stockInfo.calculationMethod,
        validation: isAvailable ? 'PASSED' : 'INSUFFICIENT_STOCK',
        message: isAvailable
          ? null
          : `Insufficient stock: Available ${stockInfo.availableQtls.toFixed(2)} QTL, Requested ${requestedQtls.toFixed(2)} QTL`
      };

    } catch (error) {
      console.error('❌ Error validating stock availability:', error);
      throw error;
    }
  }

  /**
   * Validate stock availability for rice stock operations
   * Supports both outturn-based and legacy variety matching
   */
  static async validateStockAvailability(params) {
    const { productType, packagingId, locationCode, variety, outturnId, requestedQtls, date } = params;

    console.log('🔍 Validating stock availability:', {
      productType, packagingId, locationCode, variety, outturnId, requestedQtls
    });

    try {
      const stockInfo = await this.calculateStockBalance({
        productType, packagingId, locationCode, variety, outturnId, date
      });

      const isAvailable = stockInfo.availableQtls >= requestedQtls;
      const shortfall = isAvailable ? 0 : requestedQtls - stockInfo.availableQtls;

      return {
        isAvailable,
        availableQtls: stockInfo.availableQtls,
        availableBags: stockInfo.availableBags,
        requestedQtls,
        shortfall,
        calculationMethod: stockInfo.calculationMethod,
        validation: isAvailable ? 'PASSED' : 'INSUFFICIENT_STOCK',
        message: isAvailable
          ? null
          : `Insufficient stock: Available ${stockInfo.availableQtls.toFixed(2)} QTL, Requested ${requestedQtls.toFixed(2)} QTL`
      };

    } catch (error) {
      console.error('❌ Error validating stock availability:', error);
      throw error;
    }
  }

  /**
   * Enhanced variety matching with comprehensive aliasing
   */
  static _buildEnhancedVarietyMatching(variety, outturnId) {
    if (outturnId) {
      return {
        type: 'outturn',
        condition: 'rsm.outturn_id = :outturnId',
        replacements: { outturnId }
      };
    }

    if (!variety) {
      return {
        type: 'none',
        condition: '1=1',
        replacements: {}
      };
    }

    // Generate comprehensive variety aliases
    const aliases = this._generateComprehensiveVarietyAliases(variety);

    return {
      type: 'string',
      condition: 'LOWER(TRIM(REGEXP_REPLACE(rsm.variety, \'[_\\s-]+\', \' \', \'g\'))) = ANY(ARRAY[:varietyAliases])',
      replacements: { varietyAliases: aliases }
    };
  }

  /**
   * Comprehensive variety alias generation - FIXED for Raw/Steam separation
   * This ensures "Sum25 RNR Raw" and "Sum25 RNR Steam" are treated as completely different varieties
   */
  static _generateComprehensiveVarietyAliases(variety) {
    const normalized = this._normalize(variety);
    const aliases = new Set([variety, normalized]);

    // Add case variations
    aliases.add(variety.toLowerCase());
    aliases.add(variety.toUpperCase());
    aliases.add(this._toTitleCase(variety));

    // CRITICAL FIX: Handle Raw/Steam variations WITHOUT cross-contamination
    const lowerVariety = normalized.toLowerCase();

    if (lowerVariety.includes('raw')) {
      // If it contains 'raw', ONLY add raw variations - DO NOT add steam
      const withoutRaw = lowerVariety.replace(/\s*raw\s*/gi, '').trim();
      aliases.add(withoutRaw + ' raw');
      aliases.add(withoutRaw.toUpperCase() + ' RAW');
      aliases.add(`${withoutRaw} Raw`);
      // DO NOT add steam variations here - this keeps Raw and Steam separate
    } else if (lowerVariety.includes('steam')) {
      // If it contains 'steam', ONLY add steam variations - DO NOT add raw
      const withoutSteam = lowerVariety.replace(/\s*steam\s*/gi, '').trim();
      aliases.add(withoutSteam + ' steam');
      aliases.add(withoutSteam.toUpperCase() + ' STEAM');
      aliases.add(`${withoutSteam} Steam`);
      // DO NOT add raw variations here - this keeps Raw and Steam separate
    } else {
      // If it doesn't contain either, treat as base variety without processing type
      // DO NOT automatically add Raw/Steam - let exact matching handle this
      aliases.add(lowerVariety);
      aliases.add(normalized);
    }

    // Handle common abbreviations while preserving Raw/Steam distinction
    const abbreviations = {
      'rnr': ['rnr', 'r n r', 'r.n.r'],
      'knm': ['knm', 'k n m', 'k.n.m'],
      'sum25': ['sum25', 'sum 25', 'sum-25'],
      'dec25': ['dec25', 'dec 25', 'dec-25']
    };

    for (const [key, variations] of Object.entries(abbreviations)) {
      if (lowerVariety.includes(key)) {
        variations.forEach(variation => {
          const newAlias = lowerVariety.replace(key, variation);
          aliases.add(newAlias);
          aliases.add(newAlias.toUpperCase());
        });
      }
    }

    // Remove empty aliases and ensure no cross-contamination
    const finalAliases = Array.from(aliases).filter(alias => alias && alias.trim());

    console.log(`🎯 Generated aliases for "${variety}":`, finalAliases);
    return finalAliases;
  }

  /**
   * Enhanced packaging resolution
   */
  static async _resolvePackagingInfo(packagingId, packagingBrand, bagSizeKg) {
    let resolvedInfo = {
      id: packagingId,
      brand: packagingBrand,
      sizeKg: bagSizeKg // Don't default to 26 if not provided
    };

    // Resolve packaging ID if only brand provided
    if (!packagingId && packagingBrand) {
      const result = await sequelize.query(
        'SELECT id, "allottedKg" FROM packagings WHERE LOWER("brandName") = LOWER(:brand) LIMIT 1',
        {
          replacements: { brand: packagingBrand },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (result.length > 0) {
        resolvedInfo.id = result[0].id;
        resolvedInfo.sizeKg = Number.parseFloat(result[0].allottedKg) || bagSizeKg;
      }
    }

    // Resolve packaging brand if only ID provided
    if (packagingId && !packagingBrand) {
      const result = await sequelize.query(
        'SELECT "brandName", "allottedKg" FROM packagings WHERE id = :id LIMIT 1',
        {
          replacements: { id: packagingId },
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (result.length > 0) {
        resolvedInfo.brand = result[0].brandName;
        resolvedInfo.sizeKg = Number.parseFloat(result[0].allottedKg) || bagSizeKg;
      }
    }

    return resolvedInfo;
  }

  /**
   * Convert string to title case
   */
  static _toTitleCase(str) {
    return str.replace(/\w+/g, (word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  /**
   * Normalize string for consistent comparison
   */
  static _normalize(str) {
    if (!str) return '';
    return str.toString().trim().toUpperCase();
  }

  // ============================================
  // LEGACY METHODS (for backward compatibility)
  // ============================================

  /**
   * Calculate rice stock balance for opening stock calculations
   * Updated to support outturn-based variety grouping
   */
  static async calculateOpeningStockBalance(beforeDate) {
    console.log('📊 Calculating opening stock balance with variety standardization for date:', beforeDate);

    try {
      const riceStockQuery = `
        SELECT 
          ms.variety,
          ms.outturn_id,
          ms.product_type,
          ms.location_code,
          p."brandName",
          p."allottedKg" as bagSizeKg,
          SUM(CASE 
            WHEN ms.movement_type IN ('purchase', 'production') THEN ms.bags
            WHEN ms.movement_type = 'sale' THEN -ms.bags
            WHEN ms.movement_type = 'palti' AND ms.from_location = ms.location_code THEN -COALESCE(ms.source_bags, ms.bags)
            WHEN ms.movement_type = 'palti' AND ms.to_location = ms.location_code THEN ms.bags
            ELSE 0
          END) as bags,
          SUM(CASE 
            WHEN ms.movement_type IN ('purchase', 'production') THEN ms.quantity_quintals
            WHEN ms.movement_type = 'sale' THEN -ms.quantity_quintals
            WHEN ms.movement_type = 'palti' AND ms.from_location = ms.location_code THEN -ms.quantity_quintals
            WHEN ms.movement_type = 'palti' AND ms.to_location = ms.location_code THEN ms.quantity_quintals
            ELSE 0
          END) as quintals
        FROM rice_stock_movements ms
        LEFT JOIN packagings p ON ms.packaging_id = p.id
        LEFT JOIN rice_stock_locations rsl ON LOWER(REPLACE(ms.location_code, '_', ' ')) = LOWER(REPLACE(rsl.code, '_', ' '))
        WHERE ms.date < $1
          AND ms.status = 'approved'
          AND COALESCE(rsl.is_direct_load, false) = false
        GROUP BY ms.variety, ms.outturn_id, ms.product_type, ms.location_code, p."brandName", p."allottedKg"
        HAVING SUM(CASE 
          WHEN ms.movement_type IN ('purchase', 'production') THEN ms.bags
          WHEN ms.movement_type = 'sale' THEN -ms.bags
          WHEN ms.movement_type = 'palti' AND ms.from_location = ms.location_code THEN -COALESCE(ms.source_bags, ms.bags)
          WHEN ms.movement_type = 'palti' AND ms.to_location = ms.location_code THEN ms.bags
          ELSE 0
        END) != 0 OR SUM(CASE 
          WHEN ms.movement_type IN ('purchase', 'production') THEN ms.quantity_quintals
          WHEN ms.movement_type = 'sale' THEN -ms.quantity_quintals
          WHEN ms.movement_type = 'palti' AND ms.from_location = ms.location_code THEN -ms.quantity_quintals
          WHEN ms.movement_type = 'palti' AND ms.to_location = ms.location_code THEN ms.quantity_quintals
          ELSE 0
        END) != 0
        ORDER BY ms.location_code, ms.variety, p."brandName", p."allottedKg"
      `;

      const stockBalances = await sequelize.query(riceStockQuery, {
        replacements: [beforeDate],
        type: sequelize.QueryTypes.SELECT
      });

      const balances = {};

      for (const row of stockBalances) {
        // Get standardized variety name (prefer outturn-based)
        const varietyInfo = await this._getStandardizedVarietyInfo(row.variety, row.outturn_id);

        // Determine product category using existing logic
        const category = this._determineProductCategory(row.product_type);

        // Create grouping key with standardized variety
        const brandName = this._normalize(row.brandName || 'Unknown');
        const normVariety = varietyInfo.standardizedVariety;
        const normLoc = this._normalize(row.location_code);
        const bagSize = row.bagSizeKg ? `${row.bagSizeKg}kg` : 'Unknown';

        const key = `${normLoc}|${normVariety}|${category}|${brandName}|${bagSize}`;

        console.log(`🎯 Opening Stock Entry (${varietyInfo.source}): ${normLoc} | ${normVariety} | ${category} | ${brandName} | ${bagSize} = ${Number.parseFloat(row.quintals || 0).toFixed(2)} QTL, ${Number.parseInt(row.bags || 0)} bags`);

        balances[key] = {
          locationCode: normLoc,
          variety: normVariety,
          outturnId: row.outturn_id, // Include outturn ID for traceability
          category: category,
          brandName: brandName,
          bagSizeKg: row.bagSizeKg || 0,
          bags: Number.parseInt(row.bags) || 0,
          quintals: Number.parseFloat(row.quintals) || 0,
          varietySource: varietyInfo.source // Track whether from outturn or string
        };
      }

      console.log(`📊 Opening Stock Balance calculated: ${Object.keys(balances).length} unique entries`);
      console.log('🔑 Grouping includes outturn-based variety standardization');

      return balances;

    } catch (error) {
      console.error('❌ Error calculating opening stock balance:', error);
      throw error;
    }
  }

  /**
   * Get standardized variety information
   * Prefers outturn-based variety names over string varieties
   */
  static async _getStandardizedVarietyInfo(variety, outturnId) {
    if (outturnId) {
      try {
        // Get standardized variety from outturn
        const outturnResult = await sequelize.query(
          'SELECT standardized_variety, allotted_variety FROM outturns WHERE id = $1',
          {
            replacements: [outturnId],
            type: sequelize.QueryTypes.SELECT
          }
        );

        if (outturnResult.length > 0) {
          return {
            standardizedVariety: this._normalize(outturnResult[0].standardized_variety),
            outturnId: outturnId,
            source: 'outturn-based'
          };
        }
      } catch (error) {
        console.warn(`⚠️ Could not fetch outturn ${outturnId}, falling back to string variety`);
      }
    }

    // Fallback to string variety (backward compatibility)
    return {
      standardizedVariety: this._normalize(variety),
      outturnId: null,
      source: 'string-based'
    };
  }

  /**
   * Determine product category from product type
   */
  static _determineProductCategory(productType) {
    const exactProductTypes = {
      'Rice': 'Rice',
      'Bran': 'Bran',
      'Broken': 'Broken',
      'Faram': 'Faram',
      'Unpolish': 'Unpolish',
      '0 Broken': '0 Broken',
      'Zero Broken': '0 Broken',
      'Sizer Broken': 'Sizer Broken',
      'RJ Broken': 'RJ Broken',
      'Rejection Broken': 'RJ Broken',
      'RJ Rice 1': 'RJ Rice 1',
      'RJ Rice (2)': 'RJ Rice (2)',
      'RJ Rice 2': 'RJ Rice (2)',
    };

    // Check for exact match first
    if (exactProductTypes[productType]) {
      return exactProductTypes[productType];
    }

    // Case-insensitive fallback
    const productLower = (productType || '').toLowerCase();
    const exactMatchLower = Object.entries(exactProductTypes).find(
      ([key]) => key.toLowerCase() === productLower
    );

    if (exactMatchLower) {
      return exactMatchLower[1];
    }

    // Includes-based fallback for legacy data
    if (productLower.includes('faram')) return 'Faram';
    if (productLower.includes('unpolish')) return 'Unpolish';
    if (productLower.includes('zero broken') || productLower.includes('0 broken')) return '0 Broken';
    if (productLower.includes('sizer broken')) return 'Sizer Broken';
    if (productLower.includes('rejection broken') || productLower.includes('rj broken')) return 'RJ Broken';
    if (productLower.includes('rj rice 1')) return 'RJ Rice 1';
    if (productLower.includes('rj rice 2') || productLower.includes('rj rice (2)')) return 'RJ Rice (2)';
    if (productLower.includes('broken')) return 'Broken';
    if (productLower.includes('rice') || productLower.includes('rj rice')) return 'Rice';
    if (productLower.includes('bran')) return 'Bran';

    return 'Other';
  }
}

module.exports = RiceStockCalculationService;