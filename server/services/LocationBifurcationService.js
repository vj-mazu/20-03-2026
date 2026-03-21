/**
 * Location Bifurcation Service - Rice Stock Palti Location Management
 * 
 * Provides location-specific stock visibility for palti operations with perfect bifurcation:
 * - location + complete_variety_text + product_type + packaging_name + bag_size
 * 
 * Integrates with existing RiceStockCalculationService and supports direct_load locations.
 * 
 * Requirements: 1.1, 1.2, 1.4, 3.1, 9.1, 9.2, 9.3, 9.4
 */

const { sequelize } = require('../config/database');
const RiceStockCalculationService = require('./riceStockCalculationService');

class LocationBifurcationService {
  /**
   * Get hierarchical variety-wise bifurcation with palti conversions nested under source varieties
   * Shows source varieties with their palti conversions as sub-entries
   */
  static async getHierarchicalVarietyBifurcation(params) {
    const {
      productType = 'Rice',
      date = new Date().toISOString().split('T')[0],
      debugMode = false
    } = params;

    if (debugMode) {
      console.log('🏗️ Getting hierarchical variety bifurcation with nested palti conversions:', {
        productType,
        date
      });
    }

    try {
      // Get all source varieties (varieties that have been used as palti sources)
      // CRITICAL FIX: Use GROUP BY without source_location to prevent duplicate entries
      // when the same variety is used as palti source from multiple locations
      const sourceVarietiesQuery = `
        SELECT 
          rsm.variety as source_variety,
          rsm.product_type,
          p."brandName" as source_packaging_name,
          p."allottedKg" as source_bag_size_kg,
          -- Add normalized grouping for perfect matching
          LOWER(TRIM(REGEXP_REPLACE(rsm.variety, '[_\\s-]+', ' ', 'g'))) as normalized_variety
        FROM rice_stock_movements rsm
        LEFT JOIN packagings p ON rsm.source_packaging_id = p.id
        WHERE rsm.status = 'approved'
          AND rsm.movement_type = 'palti'
          AND rsm.date <= :date
          AND rsm.product_type = :productType
          AND rsm.source_packaging_id IS NOT NULL
          AND rsm.variety IS NOT NULL 
          AND TRIM(rsm.variety) != ''
        GROUP BY 
          rsm.variety, 
          rsm.product_type, 
          p."brandName", 
          p."allottedKg"
        ORDER BY LOWER(TRIM(REGEXP_REPLACE(rsm.variety, '[_\\s-]+', ' ', 'g'))), p."brandName", p."allottedKg"
      `;

      const sourceVarieties = await sequelize.query(sourceVarietiesQuery, {
        replacements: { productType, date },
        type: sequelize.QueryTypes.SELECT
      });

      if (debugMode) {
        console.log('📦 Found source varieties:', sourceVarieties.length);
      }

      const hierarchicalBifurcation = [];

      // For each source variety, get its current stock and palti conversions
      for (const sourceVar of sourceVarieties) {
      // Get current stock for this source variety
        // CRITICAL FIX: Use normalized variety matching for perfect bifurcation
        // FIXED: Properly calculate remaining stock by deducting ALL outgoing palti operations (source_bags + shortage)
        const currentStockQuery = `
          WITH stock_calculation AS (
            -- PURCHASES: Add to stock (opening stock only - date < current_date)
            SELECT 
              rsm.location_code,
              SUM(rsm.bags) as movement_bags,
              SUM(rsm.quantity_quintals) as movement_qtls
            FROM rice_stock_movements rsm
            LEFT JOIN packagings p ON rsm.packaging_id = p.id
            WHERE rsm.status = 'approved'
              AND rsm.date < :date
              AND rsm.movement_type = 'purchase'
              AND LOWER(TRIM(REGEXP_REPLACE(rsm.variety, '[_\\s-]+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(:sourceVariety, '[_\\s-]+', ' ', 'g')))
              AND rsm.product_type = :productType
              AND p."brandName" = :sourcePackagingName
              AND p."allottedKg" = :sourceBagSizeKg
              AND rsm.variety IS NOT NULL 
              AND TRIM(rsm.variety) != ''
            GROUP BY rsm.location_code
            
            UNION ALL
            
            -- SALES: Deduct from stock (opening stock only - date < current_date)
            SELECT 
              rsm.location_code,
              SUM(-rsm.bags) as movement_bags,
              SUM(-rsm.quantity_quintals) as movement_qtls
            FROM rice_stock_movements rsm
            LEFT JOIN packagings p ON rsm.packaging_id = p.id
            WHERE rsm.status = 'approved'
              AND rsm.date < :date
              AND rsm.movement_type = 'sale'
              AND LOWER(TRIM(REGEXP_REPLACE(rsm.variety, '[_\\s-]+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(:sourceVariety, '[_\\s-]+', ' ', 'g')))
              AND rsm.product_type = :productType
              AND p."brandName" = :sourcePackagingName
              AND p."allottedKg" = :sourceBagSizeKg
              AND rsm.variety IS NOT NULL 
              AND TRIM(rsm.variety) != ''
            GROUP BY rsm.location_code
            
            UNION ALL
            
            -- PALTI SOURCE: Deduct source_bags + shortage from source location (opening stock only - date < current_date)
            SELECT 
              rsm.location_code,
              SUM(-(COALESCE(rsm.source_bags, rsm.bags) + COALESCE(rsm.conversion_shortage_bags, 0))) as movement_bags,
              SUM(-(rsm.quantity_quintals + COALESCE(rsm.conversion_shortage_kg, 0) / 100)) as movement_qtls
            FROM rice_stock_movements rsm
            LEFT JOIN packagings sp ON rsm.source_packaging_id = sp.id
            WHERE rsm.status = 'approved'
              AND rsm.date < :date
              AND rsm.movement_type = 'palti'
              AND rsm.source_packaging_id IS NOT NULL
              AND LOWER(TRIM(REGEXP_REPLACE(rsm.variety, '[_\\s-]+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(:sourceVariety, '[_\\s-]+', ' ', 'g')))
              AND rsm.product_type = :productType
              AND sp."brandName" = :sourcePackagingName
              AND sp."allottedKg" = :sourceBagSizeKg
              AND rsm.variety IS NOT NULL 
              AND TRIM(rsm.variety) != ''
            GROUP BY rsm.location_code
            
            UNION ALL
            
            -- PALTI TARGET: Add target bags to target location (opening stock only - date < current_date)
            SELECT 
              COALESCE(rsm.to_location, rsm.location_code) as location_code,
              SUM(rsm.bags) as movement_bags,
              SUM(rsm.quantity_quintals) as movement_qtls
            FROM rice_stock_movements rsm
            LEFT JOIN packagings tp ON rsm.target_packaging_id = tp.id
            WHERE rsm.status = 'approved'
              AND rsm.date < :date
              AND rsm.movement_type = 'palti'
              AND rsm.target_packaging_id IS NOT NULL
              AND LOWER(TRIM(REGEXP_REPLACE(rsm.variety, '[_\\s-]+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(:sourceVariety, '[_\\s-]+', ' ', 'g')))
              AND rsm.product_type = :productType
              AND tp."brandName" = :sourcePackagingName
              AND tp."allottedKg" = :sourceBagSizeKg
              AND rsm.variety IS NOT NULL 
              AND TRIM(rsm.variety) != ''
            GROUP BY COALESCE(rsm.to_location, rsm.location_code)
            
            UNION ALL
            
            -- PRODUCTION: Add to stock from rice_productions (opening stock only - date < current_date)
            SELECT 
              rp."locationCode" as location_code,
              SUM(rp.bags) as movement_bags,
              SUM(rp."quantityQuintals") as movement_qtls
            FROM rice_productions rp
            LEFT JOIN outturns o ON rp."outturnId" = o.id
            LEFT JOIN packagings p ON rp."packagingId" = p.id
            WHERE rp.status = 'approved'
              AND rp.date < :date
              AND LOWER(TRIM(REGEXP_REPLACE(o."allottedVariety" || ' ' || o.type, '[_\\s-]+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(:sourceVariety, '[_\\s-]+', ' ', 'g')))
              AND rp."productType" = :productType
              AND p."brandName" = :sourcePackagingName
              AND p."allottedKg" = :sourceBagSizeKg
            GROUP BY rp."locationCode"
          )
          SELECT 
            location_code,
            SUM(movement_bags) as available_bags,
            SUM(movement_qtls) as available_qtls
          FROM stock_calculation
          GROUP BY location_code
          HAVING SUM(movement_bags) > 0 OR SUM(movement_qtls) > 0.01
        `;

        const currentStock = await sequelize.query(currentStockQuery, {
          replacements: {
            sourceVariety: sourceVar.source_variety,
            productType: sourceVar.product_type,
            sourcePackagingName: sourceVar.source_packaging_name,
            sourceBagSizeKg: sourceVar.source_bag_size_kg,
            date
          },
          type: sequelize.QueryTypes.SELECT
        });

        // Get palti conversions from this source variety
        // CRITICAL FIX: Use normalized variety matching and proper source packaging filtering
        const paltiConversionsQuery = `
          SELECT 
            rsm.variety as target_variety,
            rsm.location_code as target_location,
            COALESCE(rsm.to_location, rsm.location_code) as final_target_location,
            tp."brandName" as target_packaging_name,
            tp."allottedKg" as target_bag_size_kg,
            SUM(rsm.bags) as converted_bags,
            SUM(rsm.quantity_quintals) as converted_qtls,
            SUM(COALESCE(rsm.conversion_shortage_kg, 0)) as total_shortage_kg,
            SUM(COALESCE(rsm.conversion_shortage_bags, 0)) as total_shortage_bags,
            COUNT(*) as conversion_count,
            MAX(rsm.date) as last_conversion_date
          FROM rice_stock_movements rsm
          LEFT JOIN packagings sp ON rsm.source_packaging_id = sp.id
          LEFT JOIN packagings tp ON rsm.target_packaging_id = tp.id
          WHERE rsm.status = 'approved'
            AND rsm.movement_type = 'palti'
            AND rsm.date <= :date
            AND LOWER(TRIM(REGEXP_REPLACE(rsm.variety, '[_\\s-]+', ' ', 'g'))) = LOWER(TRIM(REGEXP_REPLACE(:sourceVariety, '[_\\s-]+', ' ', 'g')))
            AND rsm.product_type = :productType
            AND sp."brandName" = :sourcePackagingName
            AND sp."allottedKg" = :sourceBagSizeKg
            AND rsm.variety IS NOT NULL 
            AND TRIM(rsm.variety) != ''
          GROUP BY 
            rsm.variety,
            rsm.location_code,
            COALESCE(rsm.to_location, rsm.location_code),
            tp."brandName",
            tp."allottedKg"
          ORDER BY converted_bags DESC
        `;

        const paltiConversions = await sequelize.query(paltiConversionsQuery, {
          replacements: {
            sourceVariety: sourceVar.source_variety,
            productType: sourceVar.product_type,
            sourcePackagingName: sourceVar.source_packaging_name,
            sourceBagSizeKg: sourceVar.source_bag_size_kg,
            date
          },
          type: sequelize.QueryTypes.SELECT
        });

        // Build hierarchical structure
        const sourceEntry = {
          type: 'source_variety',
          variety: sourceVar.source_variety,
          productType: sourceVar.product_type,
          packagingName: sourceVar.source_packaging_name,
          bagSizeKg: sourceVar.source_bag_size_kg,
          groupingKey: `${sourceVar.source_variety}|${sourceVar.product_type}|${sourceVar.source_packaging_name}|${sourceVar.source_bag_size_kg}kg`,

          // Current remaining stock
          currentStock: currentStock.map(stock => ({
            locationCode: stock.location_code,
            availableBags: Math.max(0, parseInt(stock.available_bags || 0)),
            availableQtls: Math.max(0, parseFloat(stock.available_qtls || 0))
          })),

          // Palti conversions nested under this source
          paltiConversions: paltiConversions.map(conversion => ({
            type: 'palti_conversion',
            targetVariety: conversion.target_variety,
            sourceLocation: conversion.target_location,
            targetLocation: conversion.final_target_location,
            targetPackagingName: conversion.target_packaging_name,
            targetBagSizeKg: conversion.target_bag_size_kg,
            convertedBags: parseInt(conversion.converted_bags || 0),
            convertedQtls: parseFloat(conversion.converted_qtls || 0),
            shortageKg: parseFloat(conversion.total_shortage_kg || 0),
            shortageBags: parseFloat(conversion.total_shortage_bags || 0),
            conversionCount: parseInt(conversion.conversion_count || 0),
            lastConversionDate: conversion.last_conversion_date,
            groupingKey: `${sourceVar.source_variety}→${conversion.target_variety}|${conversion.target_packaging_name}|${conversion.target_bag_size_kg}kg`
          })),

          // Summary totals
          totals: {
            remainingBags: currentStock.reduce((sum, stock) => sum + parseInt(stock.available_bags || 0), 0),
            remainingQtls: currentStock.reduce((sum, stock) => sum + parseFloat(stock.available_qtls || 0), 0),
            totalConvertedBags: paltiConversions.reduce((sum, conv) => sum + parseInt(conv.converted_bags || 0), 0),
            totalConvertedQtls: paltiConversions.reduce((sum, conv) => sum + parseFloat(conv.converted_qtls || 0), 0),
            totalShortageKg: paltiConversions.reduce((sum, conv) => sum + parseFloat(conv.total_shortage_kg || 0), 0),
            totalConversions: paltiConversions.length
          }
        };

        hierarchicalBifurcation.push(sourceEntry);
      }

      const result = {
        productType,
        date,
        hierarchicalBifurcation,
        summary: {
          totalSourceVarieties: hierarchicalBifurcation.length,
          totalPaltiConversions: hierarchicalBifurcation.reduce((sum, source) => sum + source.paltiConversions.length, 0),
          totalRemainingBags: hierarchicalBifurcation.reduce((sum, source) => sum + source.totals.remainingBags, 0),
          totalConvertedBags: hierarchicalBifurcation.reduce((sum, source) => sum + source.totals.totalConvertedBags, 0)
        },
        debugInfo: debugMode ? {
          sourceVarietiesFound: sourceVarieties.length,
          queryParameters: { productType, date }
        } : undefined
      };

      if (debugMode) {
        console.log('🏗️ Hierarchical Variety Bifurcation Complete:', result.summary);
      }

      return result;

    } catch (error) {
      console.error('❌ Error getting hierarchical variety bifurcation:', error);
      throw error;
    }
  }

  /**
   * Validate if sale is allowed based on remaining stock after palti operations
   * CRITICAL: Uses date < saleDate for opening stock to prevent mixing opening and closing stock
   * @param {Object} params - Sale validation parameters
   * @returns {Object} - Validation result with available stock
   */
  static async validateSaleAfterPalti(params) {
    const {
      locationCode,
      variety,
      productType,
      packagingId,
      packagingBrand,
      bagSizeKg,
      requestedBags,
      saleDate,
      debugMode = false
    } = params;

    if (debugMode) {
      console.log('🔍 Validating sale after palti:', {
        locationCode,
        variety,
        productType,
        packagingId,
        packagingBrand,
        bagSizeKg,
        requestedBags,
        saleDate
      });
    }

    try {
      // 1. Resolve packaging info
      const packagingInfo = await this._resolvePackagingInfo(packagingId, packagingBrand, bagSizeKg);
      
      // 2. Build variety matching
      const varietyConditions = this._buildVarietyMatching(variety, null);
      
      // 3. Calculate opening stock (date <= saleDate) - CRITICAL FIX
      const openingStockQuery = `
        WITH stock_calculation AS (
          -- PURCHASES (opening stock - include same-date purchases)
          -- CRITICAL FIX: Include same-date purchases (date <= saleDate) because purchase happens BEFORE sale
          SELECT SUM(rsm.bags) as movement_bags
          FROM rice_stock_movements rsm
          LEFT JOIN packagings p ON rsm.packaging_id = p.id
          WHERE rsm.status = 'approved'
            AND rsm.date <= :saleDate
            AND rsm.movement_type = 'purchase'
            AND rsm.location_code = :locationCode
            AND rsm.product_type = :productType
            AND p."brandName" = :packagingBrand
            AND p."allottedKg" = :bagSizeKg
            ${varietyConditions.condition !== '1=1' ? `AND ${varietyConditions.condition}` : ''}
          
          UNION ALL
          
          -- SALES (deduct from opening stock)
          SELECT SUM(-rsm.bags) as movement_bags
          FROM rice_stock_movements rsm
          LEFT JOIN packagings p ON rsm.packaging_id = p.id
          WHERE rsm.status = 'approved'
            AND rsm.date < :saleDate
            AND rsm.movement_type = 'sale'
            AND rsm.location_code = :locationCode
            AND rsm.product_type = :productType
            AND p."brandName" = :packagingBrand
            AND p."allottedKg" = :bagSizeKg
            ${varietyConditions.condition !== '1=1' ? `AND ${varietyConditions.condition}` : ''}
          
          UNION ALL
          
          -- PALTI SOURCE (deduct source_bags + shortage from opening stock)
          SELECT SUM(-(COALESCE(rsm.source_bags, rsm.bags) + COALESCE(rsm.conversion_shortage_bags, 0))) as movement_bags
          FROM rice_stock_movements rsm
          LEFT JOIN packagings sp ON rsm.source_packaging_id = sp.id
          WHERE rsm.status = 'approved'
            AND rsm.date < :saleDate
            AND rsm.movement_type = 'palti'
            AND rsm.location_code = :locationCode
            AND rsm.product_type = :productType
            AND sp."brandName" = :packagingBrand
            AND sp."allottedKg" = :bagSizeKg
            ${varietyConditions.condition !== '1=1' ? `AND ${varietyConditions.condition}` : ''}
          
          UNION ALL
          
          -- PALTI TARGET (add target bags to opening stock)
          -- CRITICAL FIX: Include same-date palti targets (date <= saleDate) because palti happens BEFORE sale
          SELECT SUM(rsm.bags) as movement_bags
          FROM rice_stock_movements rsm
          LEFT JOIN packagings tp ON rsm.target_packaging_id = tp.id
          WHERE rsm.status = 'approved'
            AND rsm.date <= :saleDate
            AND rsm.movement_type = 'palti'
            AND COALESCE(rsm.to_location, rsm.location_code) = :locationCode
            AND rsm.product_type = :productType
            AND tp."brandName" = :packagingBrand
            AND tp."allottedKg" = :bagSizeKg
            ${varietyConditions.condition !== '1=1' ? `AND ${varietyConditions.condition}` : ''}
          
          UNION ALL
          
          -- PRODUCTION (add to opening stock)
          -- CRITICAL FIX: Include same-date productions (date <= saleDate) because production happens BEFORE sale
          SELECT SUM(rp.bags) as movement_bags
          FROM rice_productions rp
          LEFT JOIN outturns o ON rp."outturnId" = o.id
          LEFT JOIN packagings p ON rp."packagingId" = p.id
          WHERE rp.status = 'approved'
            AND rp.date <= :saleDate
            AND rp."locationCode" = :locationCode
            AND rp."productType" = :productType
            AND p."brandName" = :packagingBrand
            AND p."allottedKg" = :bagSizeKg
        )
        SELECT COALESCE(SUM(movement_bags), 0) as opening_stock
        FROM stock_calculation
      `;
      
      // 4. Get palti operations ON saleDate (before this sale)
      const paltiOnDateQuery = `
        SELECT COALESCE(SUM(COALESCE(rsm.source_bags, rsm.bags) + COALESCE(rsm.conversion_shortage_bags, 0)), 0) as palti_deductions
        FROM rice_stock_movements rsm
        LEFT JOIN packagings sp ON rsm.source_packaging_id = sp.id
        WHERE rsm.status = 'approved'
          AND rsm.date = :saleDate
          AND rsm.movement_type = 'palti'
          AND rsm.location_code = :locationCode
          AND rsm.product_type = :productType
          AND sp."brandName" = :packagingBrand
          AND sp."allottedKg" = :bagSizeKg
          ${varietyConditions.condition !== '1=1' ? `AND ${varietyConditions.condition}` : ''}
      `;
      
      // Execute queries
      const replacements = {
        saleDate,
        locationCode,
        productType,
        packagingBrand: packagingInfo.brand,
        bagSizeKg: packagingInfo.sizeKg,
        ...varietyConditions.replacements
      };
      
      const [openingResult] = await sequelize.query(openingStockQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });
      
      const [paltiResult] = await sequelize.query(paltiOnDateQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });
      
      const openingStock = parseInt(openingResult.opening_stock || 0);
      const paltiDeductions = parseInt(paltiResult.palti_deductions || 0);
      const remainingStock = openingStock - paltiDeductions;
      
      const isValid = remainingStock >= requestedBags;
      
      if (debugMode) {
        console.log('🔍 Sale Validation:', {
          openingStock,
          paltiDeductions,
          remainingStock,
          requestedBags,
          isValid
        });
      }
      
      return {
        isValid,
        openingStock,
        paltiDeductions,
        remainingStock,
        requestedBags,
        shortfall: isValid ? 0 : requestedBags - remainingStock,
        message: isValid
          ? `Validation passed: ${remainingStock} bags available`
          : `Insufficient stock. Available: ${remainingStock} bags (Opening: ${openingStock}, Palti: -${paltiDeductions}), Requested: ${requestedBags} bags`,
        groupKey: `${locationCode}|${variety}|${packagingInfo.brand}|${packagingInfo.sizeKg}|${productType}`
      };
      
    } catch (error) {
      console.error('❌ Error validating sale after palti:', error);
      throw error;
    }
  }

  /**
   * Get location-specific stock breakdown for palti operations
   * Shows all locations that have stock for a specific variety-packaging combination
   */
  static async getLocationStockBreakdown(params) {
    const {
      variety,
      outturnId,
      productType = 'Rice',
      packagingId,
      packagingBrand,
      bagSizeKg,
      date = new Date().toISOString().split('T')[0],
      debugMode = false
    } = params;

    if (debugMode) {
      console.log('🏢 Getting location stock breakdown for palti:', {
        variety,
        outturnId,
        productType,
        packagingId,
        packagingBrand,
        bagSizeKg,
        date
      });
    }

    try {
      // Resolve packaging information for consistent grouping
      const packagingInfo = await this._resolvePackagingInfo(packagingId, packagingBrand, bagSizeKg);

      // Build variety matching conditions
      const varietyConditions = this._buildVarietyMatching(variety, outturnId);

      if (debugMode) {
        console.log('📦 Resolved Packaging Info:', packagingInfo);
        console.log('🎯 Variety Matching Conditions:', varietyConditions);
      }

      // Build location bifurcation query with direct_load support
      const locationQuery = `
        WITH location_stock_calculation AS (
          -- Rice Stock Movements with location details
          SELECT 
            rsm.location_code,
            rsl.name as location_name,
            rsl.is_direct_load,
            rsm.variety as complete_variety_text,
            rsm.product_type,
            p."brandName" as packaging_name,
            p."allottedKg" as bag_size_kg,
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
            AND rsm.date <= :date
            AND rsm.product_type = :productType
            ${packagingInfo.brand ? 'AND p."brandName" = :packagingBrand' : ''}
            ${packagingInfo.sizeKg ? 'AND p."allottedKg" = :bagSizeKg' : ''}
            ${varietyConditions.condition !== '1=1' ? `AND ${varietyConditions.condition}` : ''}
          GROUP BY 
            rsm.location_code,
            rsl.name,
            rsl.is_direct_load,
            rsm.variety,
            rsm.product_type,
            p."brandName",
            p."allottedKg"
          
          UNION ALL
          
          -- Rice Productions with location details (outturn-based)
          SELECT 
            rp."locationCode" as location_code,
            rsl.name as location_name,
            rsl.is_direct_load,
            UPPER(o."allottedVariety" || ' ' || o.type) as complete_variety_text,
            rp."productType" as product_type,
            p."brandName" as packaging_name,
            p."allottedKg" as bag_size_kg,
            SUM(rp.bags) as movement_bags,
            SUM(rp."quantityQuintals") as movement_qtls,
            0 as palti_count,
            MAX(rp.date) as last_movement_date
          FROM rice_productions rp
          JOIN outturns o ON rp."outturnId" = o.id
          LEFT JOIN packagings p ON rp."packagingId" = p.id
          LEFT JOIN rice_stock_locations rsl ON LOWER(REPLACE(rp."locationCode", '_', ' ')) = LOWER(REPLACE(rsl.code, '_', ' '))
          WHERE rp.status = 'approved'
            AND rp.date <= :date
            AND rp."productType" = :productType
            ${packagingInfo.brand ? 'AND p."brandName" = :packagingBrand' : ''}
            ${packagingInfo.sizeKg ? 'AND p."allottedKg" = :bagSizeKg' : ''}
            ${varietyConditions.type === 'outturn' ? 'AND rp."outturnId" = :outturnId' : ''}
            ${varietyConditions.type === 'string' ? 'AND LOWER(TRIM(REGEXP_REPLACE(o."allottedVariety" || \' \' || o.type, \'[_\\s-]+\', \' \', \'g\'))) = ANY(ARRAY[:varietyAliases])' : ''}
          GROUP BY 
            rp."locationCode",
            rsl.name,
            rsl.is_direct_load,
            o."allottedVariety",
            o.type,
            rp."productType",
            p."brandName",
            p."allottedKg"
        )
        SELECT 
          location_code,
          location_name,
          is_direct_load,
          complete_variety_text,
          product_type,
          packaging_name,
          bag_size_kg,
          SUM(movement_bags) as available_bags,
          SUM(movement_qtls) as available_qtls,
          SUM(palti_count) as total_palti_operations,
          MAX(last_movement_date) as last_movement_date
        FROM location_stock_calculation
        GROUP BY 
          location_code,
          location_name,
          is_direct_load,
          complete_variety_text,
          product_type,
          packaging_name,
          bag_size_kg
        HAVING SUM(movement_bags) > 0 OR SUM(movement_qtls) > 0
        ORDER BY 
          location_code ASC,
          SUM(movement_bags) DESC
      `;

      // Build replacements
      const replacements = {
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
        console.log('🔍 Location Bifurcation Query:', locationQuery);
        console.log('🔍 Query Replacements:', replacements);
      }

      const result = await sequelize.query(locationQuery, {
        replacements,
        type: sequelize.QueryTypes.SELECT
      });

      if (debugMode) {
        console.log('🔍 Location Query Results:', result);
      }

      // Format results for display
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
        groupingKey: `${row.location_code}|${row.complete_variety_text}|${row.product_type}|${row.packaging_name}|${row.bag_size_kg}kg`
      }));

      // Calculate totals and statistics
      const totals = {
        totalBags: locationBreakdown.reduce((sum, item) => sum + item.availableBags, 0),
        totalQtls: locationBreakdown.reduce((sum, item) => sum + item.availableQtls, 0),
        uniqueLocations: locationBreakdown.length,
        directLoadLocations: locationBreakdown.filter(item => item.isDirectLoad).length,
        regularLocations: locationBreakdown.filter(item => !item.isDirectLoad).length,
        totalPaltiOperations: locationBreakdown.reduce((sum, item) => sum + item.totalPaltiOperations, 0)
      };

      const locationBifurcationResult = {
        variety: variety || 'Unknown',
        outturnId,
        productType,
        packagingInfo,
        date,
        locationBreakdown,
        totals,
        calculationMethod: outturnId ? 'outturn-based' : 'variety-string',
        debugInfo: debugMode ? {
          queryParameters: replacements,
          varietyMatching: varietyConditions,
          packagingResolution: packagingInfo
        } : undefined
      };

      if (debugMode) {
        console.log('🏢 Complete Location Bifurcation:', locationBifurcationResult);
      }

      return locationBifurcationResult;

    } catch (error) {
      console.error('❌ Error getting location stock breakdown:', error);
      throw error;
    }
  }

  /**
   * Validate palti operation against specific location stock
   * Ensures sufficient stock exists at source location for the requested quantity
   */
  static async validatePaltiByLocation(params) {
    const {
      sourceLocation,
      variety,
      outturnId,
      productType = 'Rice',
      packagingId,
      packagingBrand,
      bagSizeKg,
      requestedBags,
      requestedQtls,
      date = new Date().toISOString().split('T')[0],
      debugMode = false
    } = params;

    if (debugMode) {
      console.log('🔍 Validating palti by location:', {
        sourceLocation,
        variety,
        outturnId,
        productType,
        packagingId,
        packagingBrand,
        bagSizeKg,
        requestedBags,
        requestedQtls
      });
    }

    try {
      // Get stock balance for specific location
      const stockInfo = await RiceStockCalculationService.calculateStockBalance({
        locationCode: sourceLocation,
        variety,
        outturnId,
        productType,
        packagingId,
        packagingBrand,
        bagSizeKg,
        date,
        debugMode
      });

      // Validate requested quantities
      const bagsAvailable = requestedBags ? stockInfo.availableBags >= requestedBags : true;
      const qtlsAvailable = requestedQtls ? stockInfo.availableQtls >= requestedQtls : true;
      const isValid = bagsAvailable && qtlsAvailable;

      // Calculate shortfalls
      const bagShortfall = requestedBags ? Math.max(0, requestedBags - stockInfo.availableBags) : 0;
      const qtlShortfall = requestedQtls ? Math.max(0, requestedQtls - stockInfo.availableQtls) : 0;

      // Check if location is direct_load
      const [locationInfo] = await sequelize.query(
        `SELECT name, is_direct_load FROM rice_stock_locations 
         WHERE LOWER(REPLACE(code, '_', ' ')) = LOWER(REPLACE(:locationCode, '_', ' ')) 
         LIMIT 1`,
        {
          replacements: { locationCode: sourceLocation },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const validationResult = {
        isValid,
        sourceLocation,
        locationName: locationInfo?.name || sourceLocation,
        isDirectLoad: Boolean(locationInfo?.is_direct_load),
        variety: stockInfo.completeVarietyText,
        productType,
        packagingName: stockInfo.packagingName,
        bagSizeKg: stockInfo.bagSizeKg,
        availableBags: stockInfo.availableBags,
        availableQtls: stockInfo.availableQtls,
        requestedBags: requestedBags || 0,
        requestedQtls: requestedQtls || 0,
        bagShortfall,
        qtlShortfall,
        calculationMethod: stockInfo.calculationMethod,
        validation: isValid ? 'PASSED' : 'INSUFFICIENT_STOCK',
        message: isValid
          ? `Validation passed: Sufficient stock available at ${sourceLocation}`
          : `Insufficient stock at ${sourceLocation}: Available ${stockInfo.availableBags} bags (${stockInfo.availableQtls.toFixed(2)} QTL), Requested ${requestedBags || 0} bags (${requestedQtls || 0} QTL)`,
        suggestions: isValid ? [] : this._generateStockSuggestions(stockInfo, requestedBags, requestedQtls),
        debugInfo: debugMode ? {
          stockCalculation: stockInfo,
          locationInfo
        } : undefined
      };

      if (debugMode) {
        console.log('🔍 Palti Validation Result:', validationResult);
      }

      return validationResult;

    } catch (error) {
      console.error('❌ Error validating palti by location:', error);
      throw error;
    }
  }

  /**
   * Update stock after palti operation
   * Handles real-time stock updates for source and target locations
   */
  static async updateStockAfterPalti(paltiData) {
    const {
      sourceLocation,
      targetLocation,
      variety,
      outturnId,
      productType,
      sourcePackagingId,
      targetPackagingId,
      bags,
      quantityQuintals,
      date = new Date().toISOString().split('T')[0],
      debugMode = false
    } = paltiData;

    if (debugMode) {
      console.log('🔄 Updating stock after palti operation:', {
        sourceLocation,
        targetLocation,
        variety,
        outturnId,
        productType,
        sourcePackagingId,
        targetPackagingId,
        bags,
        quantityQuintals
      });
    }

    try {
      // Get updated stock balances for both locations
      const sourceStockPromise = RiceStockCalculationService.calculateStockBalance({
        locationCode: sourceLocation,
        variety,
        outturnId,
        productType,
        packagingId: sourcePackagingId,
        date,
        debugMode
      });

      let targetStockPromise = null;
      if (targetLocation && targetLocation !== sourceLocation) {
        targetStockPromise = RiceStockCalculationService.calculateStockBalance({
          locationCode: targetLocation,
          variety,
          outturnId,
          productType,
          packagingId: targetPackagingId,
          date,
          debugMode
        });
      }

      const [sourceStock, targetStock] = await Promise.all([
        sourceStockPromise,
        targetStockPromise
      ]);

      const updateResult = {
        sourceLocation,
        targetLocation,
        sourceUpdated: true,
        targetUpdated: Boolean(targetStock),
        newBalances: {
          source: {
            locationCode: sourceLocation,
            availableBags: sourceStock.availableBags,
            availableQtls: sourceStock.availableQtls,
            packagingName: sourceStock.packagingName,
            bagSizeKg: sourceStock.bagSizeKg
          },
          target: targetStock ? {
            locationCode: targetLocation,
            availableBags: targetStock.availableBags,
            availableQtls: targetStock.availableQtls,
            packagingName: targetStock.packagingName,
            bagSizeKg: targetStock.bagSizeKg
          } : null
        },
        paltiOperation: {
          variety: sourceStock.completeVarietyText,
          productType,
          bags,
          quantityQuintals,
          date
        },
        debugInfo: debugMode ? {
          sourceStockCalculation: sourceStock,
          targetStockCalculation: targetStock
        } : undefined
      };

      if (debugMode) {
        console.log('🔄 Stock Update Result:', updateResult);
      }

      return updateResult;

    } catch (error) {
      console.error('❌ Error updating stock after palti:', error);
      throw error;
    }
  }

  /**
   * Get all locations with stock for a specific variety (for location selection)
   */
  static async getAvailableLocationsForVariety(params) {
    const {
      variety,
      outturnId,
      productType = 'Rice',
      date = new Date().toISOString().split('T')[0]
    } = params;

    try {
      const locationBreakdown = await this.getLocationStockBreakdown({
        variety,
        outturnId,
        productType,
        date
      });

      // Return simplified location list for selection
      return locationBreakdown.locationBreakdown.map(location => ({
        locationCode: location.locationCode,
        locationName: location.locationName,
        isDirectLoad: location.isDirectLoad,
        availableBags: location.availableBags,
        availableQtls: location.availableQtls,
        packagingName: location.packagingName,
        bagSizeKg: location.bagSizeKg
      })).sort((a, b) => a.locationCode.localeCompare(b.locationCode));

    } catch (error) {
      console.error('❌ Error getting available locations for variety:', error);
      throw error;
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Build variety matching conditions (reuse from RiceStockCalculationService)
   */
  static _buildVarietyMatching(variety, outturnId) {
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
    const aliases = this._generateVarietyAliases(variety);

    return {
      type: 'string',
      condition: 'LOWER(TRIM(REGEXP_REPLACE(rsm.variety, \'[_\\s-]+\', \' \', \'g\'))) = ANY(ARRAY[:varietyAliases])',
      replacements: { varietyAliases: aliases }
    };
  }

  /**
   * Generate variety aliases for matching
   * CRITICAL FIX: RAW and STEAM are SEPARATE varieties - NEVER merge them!
   */
  static _generateVarietyAliases(variety) {
    const normalized = this._normalize(variety);
    const aliases = new Set([variety, normalized]);

    // Add case variations ONLY (preserve RAW/STEAM distinction)
    aliases.add(variety.toLowerCase());
    aliases.add(variety.toUpperCase());
    aliases.add(this._toTitleCase(variety));

    // CRITICAL: RAW and STEAM are SEPARATE varieties
    // Only add exact variations with the SAME processing type
    const lowerVariety = normalized.toLowerCase();

    if (lowerVariety.includes('raw')) {
      // Only add RAW variations - NEVER add without RAW
      aliases.add(variety.replace(/raw/gi, 'RAW'));
      aliases.add(variety.replace(/raw/gi, 'Raw'));
      aliases.add(variety.replace(/raw/gi, 'raw'));
    } else if (lowerVariety.includes('steam')) {
      // Only add STEAM variations - NEVER add without STEAM
      aliases.add(variety.replace(/steam/gi, 'STEAM'));
      aliases.add(variety.replace(/steam/gi, 'Steam'));
      aliases.add(variety.replace(/steam/gi, 'steam'));
    }

    // CRITICAL: Filter out any aliases that don't preserve the processing type
    const hasRaw = lowerVariety.includes('raw');
    const hasSteam = lowerVariety.includes('steam');
    
    return Array.from(aliases).filter(alias => {
      if (!alias || !alias.trim()) return false;
      const aliasLower = alias.toLowerCase();
      
      // If original has RAW, alias MUST have RAW
      if (hasRaw && !aliasLower.includes('raw')) return false;
      
      // If original has STEAM, alias MUST have STEAM
      if (hasSteam && !aliasLower.includes('steam')) return false;
      
      // If original has neither, alias must also have neither
      if (!hasRaw && !hasSteam && (aliasLower.includes('raw') || aliasLower.includes('steam'))) return false;
      
      return true;
    });
  }

  /**
   * Resolve packaging information
   */
  static async _resolvePackagingInfo(packagingId, packagingBrand, bagSizeKg) {
    let resolvedInfo = {
      id: packagingId,
      brand: packagingBrand,
      sizeKg: bagSizeKg
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
        resolvedInfo.sizeKg = parseFloat(result[0].allottedKg) || bagSizeKg;
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
        resolvedInfo.sizeKg = parseFloat(result[0].allottedKg) || bagSizeKg;
      }
    }

    return resolvedInfo;
  }

  /**
   * Generate suggestions for insufficient stock scenarios
   */
  static _generateStockSuggestions(stockInfo, requestedBags, requestedQtls) {
    const suggestions = [];

    if (requestedBags && stockInfo.availableBags > 0) {
      suggestions.push(`Reduce quantity to ${stockInfo.availableBags} bags or less`);
    }

    if (requestedQtls && stockInfo.availableQtls > 0) {
      suggestions.push(`Reduce quantity to ${stockInfo.availableQtls.toFixed(2)} QTL or less`);
    }

    if (stockInfo.availableBags === 0 && stockInfo.availableQtls === 0) {
      suggestions.push('Check other locations for available stock');
      suggestions.push('Verify variety and packaging selection');
    }

    return suggestions;
  }

  /**
   * Utility methods
   */
  static _toTitleCase(str) {
    return str.replace(/\w+/g, (word) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  static _normalize(str) {
    if (!str) return '';
    return str.toString().trim().toUpperCase();
  }
}

module.exports = LocationBifurcationService;