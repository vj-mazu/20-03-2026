/**
 * Product Type Category Utility
 * 
 * Defines product type categories and provides validation functions
 * to prevent invalid type conversions in palti operations.
 * 
 * Business Rule: Palti operations can only convert within the same category
 * - Rice → Rice ✓
 * - Broken → Broken ✓
 * - Bran → Bran ✓
 * - Rice → Broken ✗
 * - Broken → Rice ✗
 */

const PRODUCT_TYPE_CATEGORIES = {
  RICE: ['Rice', 'RJ Rice 1', 'RJ Rice 2', 'RJ Rice (2)', 'Rejection Rice', 'Unpolished', 'Unpolish'],
  BROKEN: ['Sizer Broken', 'Rejection Broken', 'RJ Broken', 'Broken', 'Zero Broken', '0 Broken'],
  BRAN: ['Bran', 'Farm Bran'],
  OTHER: ['Faram', 'Farm']
};

/**
 * Get the category for a given product type
 * @param {string} productType - The product type to categorize
 * @returns {string} The category name (RICE, BROKEN, BRAN, OTHER, or UNKNOWN)
 */
function getProductTypeCategory(productType) {
  if (!productType) return 'UNKNOWN';

  for (const [category, types] of Object.entries(PRODUCT_TYPE_CATEGORIES)) {
    if (types.includes(productType)) {
      return category;
    }
  }

  return 'UNKNOWN';
}

/**
 * Check if a type conversion is allowed (same category only)
 * @param {string} sourceType - The source product type
 * @param {string} targetType - The target product type
 * @returns {boolean} True if conversion is allowed, false otherwise
 */
function canConvertTypes(sourceType, targetType) {
  const sourceCategory = getProductTypeCategory(sourceType);
  const targetCategory = getProductTypeCategory(targetType);

  // Only allow conversions within same category
  // Reject if either type is unknown
  return sourceCategory === targetCategory && sourceCategory !== 'UNKNOWN';
}

/**
 * Get all product types in a category
 * @param {string} category - The category name (RICE, BROKEN, BRAN, OTHER)
 * @returns {string[]} Array of product types in that category
 */
function getProductTypesInCategory(category) {
  return PRODUCT_TYPE_CATEGORIES[category] || [];
}

/**
 * Validate product type exists in any category
 * @param {string} productType - The product type to validate
 * @returns {boolean} True if product type is valid
 */
function isValidProductType(productType) {
  return getProductTypeCategory(productType) !== 'UNKNOWN';
}

module.exports = {
  PRODUCT_TYPE_CATEGORIES,
  getProductTypeCategory,
  canConvertTypes,
  getProductTypesInCategory,
  isValidProductType
};
