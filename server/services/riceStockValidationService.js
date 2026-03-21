/**
 * Rice Stock Validation Service
 * 
 * Provides complete dimension validation for rice stock operations.
 * Validates all 5 dimensions: location + product_type + variety + packaging + bag_size
 */

const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

/**
 * Validates complete palti dimensions before operation
 * Checks all 5 dimensions: location + type + variety + packaging + bagsize
 * 
 * @param {Object} params - Validation parameters
 * @param {string} params.sourceLocation - Source location code
 * @param {string} params.productType - Product type
 * @param {string} params.variety - Variety name
 * @param {number} params.sourcePackagingId - Source packaging ID
 * @param {number} params.sourceBagSizeKg - Source bag size in kg
 * @param {number} params.requestedQuantity - Requested quantity in quintals
 * @param {string} params.date - Date for stock calculation
 * @returns {Promise<Object>} Validation result with availability details
 */
async function validateCompletePaltiDimensions({
  sourceLocation,
  productType,
  variety,
  sourcePackagingId,
  sourceBagSizeKg,
  requestedQuantity,
  date = new Date().toISOString().split('T')[0]
}) {
  try {
    console.log('🔍 Validating complete palti dimensions:', {
      sourceLocation,
      productType,
      variety,
      sourcePackagingId,
      sourceBagSizeKg,
      requestedQuantity,
      date
    });

    // Normalize variety for comparison
    const normalize = (str) => {
      if (!str) return '';
      return String(str)
        .toLowerCase()
        .trim()
        .replace(/[_\s-]+/g, ' ');
    };

    const normalizedVariety = normalize(variety);

    // Query with ALL five dimensions
    const query = `
      WITH movement_stock AS (
        SELECT 
          COALESCE(SUM(CASE 
            WHEN movement_type IN ('production', 'purchase') AND packaging_id = :sourcePackagingId THEN quantity_quintals
            WHEN movement_type = 'sale' AND packaging_id = :sourcePackagingId THEN -quantity_quintals
            WHEN movement_type = 'palti' AND source_packaging_id = :sourcePackagingId THEN -quantity_quintals
            WHEN movement_type = 'palti' AND target_packaging_id = :sourcePackagingId THEN quantity_quintals
            ELSE 0
          END), 0) as movement_qtls
        FROM rice_stock_movements rsm
        LEFT JOIN packagings p ON rsm.packaging_id = p.id
        WHERE rsm.status = 'approved'
          AND rsm.location_code = :sourceLocation
          AND UPPER(rsm.product_type) = UPPER(:productType)
          AND lower(trim(regexp_replace(rsm.variety, '[_\\\\s-]+', ' ', 'g'))) = :normalizedVariety
          AND p.allotted_kg = :sourceBagSizeKg
          AND rsm.date <= :date
      ),
      production_stock AS (
        SELECT COALESCE(SUM(rp."quantityQuintals"), 0) as prod_qtls
        FROM rice_productions rp
        LEFT JOIN outturns o ON rp."outturnId" = o.id
        LEFT JOIN packagings p ON rp."packagingId" = p.id
        WHERE rp."locationCode" = :sourceLocation
          AND UPPER(rp."productType") = UPPER(:productType)
          AND lower(trim(regexp_replace(o."allottedVariety" || ' ' || o.type, '[_\\\\s-]+', ' ', 'g'))) = :normalizedVariety
          AND rp.status = 'approved'
          AND rp."packagingId" = :sourcePackagingId
          AND p.allotted_kg = :sourceBagSizeKg
          AND rp.date <= :date
      )
      SELECT 
        (COALESCE(ms.movement_qtls, 0) + COALESCE(ps.prod_qtls, 0)) as available_qtls
      FROM movement_stock ms, production_stock ps
    `;

    const result = await sequelize.query(query, {
      replacements: {
        sourceLocation,
        productType,
        normalizedVariety,
        sourcePackagingId: parseInt(sourcePackagingId),
        sourceBagSizeKg: parseFloat(sourceBagSizeKg),
        date
      },
      type: QueryTypes.SELECT
    });

    const available = parseFloat(result[0]?.available_qtls || 0);
    const isValid = available >= requestedQuantity;

    console.log('📊 Complete dimension validation result:', {
      available: available.toFixed(2),
      requested: requestedQuantity.toFixed(2),
      isValid,
      dimensions: {
        location: sourceLocation,
        productType,
        variety,
        packagingId: sourcePackagingId,
        bagSizeKg: sourceBagSizeKg
      }
    });

    return {
      isValid,
      available,
      requested: requestedQuantity,
      dimensions: {
        location: sourceLocation,
        productType,
        variety,
        packagingId: sourcePackagingId,
        bagSizeKg: sourceBagSizeKg
      }
    };

  } catch (error) {
    console.error('❌ Complete dimension validation error:', error);
    throw new Error(`Dimension validation failed: ${error.message}`);
  }
}

/**
 * Validates that all required dimensions are present
 * @param {Object} dimensions - Dimension object to validate
 * @returns {Object} Validation result with missing dimensions
 */
function validateDimensionsPresent(dimensions) {
  const required = ['location', 'productType', 'variety', 'packagingId', 'bagSizeKg'];
  const missing = [];

  for (const field of required) {
    if (!dimensions[field] && dimensions[field] !== 0) {
      missing.push(field);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    message: missing.length > 0 
      ? `Missing required dimensions: ${missing.join(', ')}`
      : 'All dimensions present'
  };
}

module.exports = {
  validateCompletePaltiDimensions,
  validateDimensionsPresent
};
