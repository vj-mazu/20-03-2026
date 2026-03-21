/**
 * Palti Display Helper Functions
 * 
 * Utility functions for displaying palti entries with proper formatting,
 * shortage calculations, and packaging information.
 */

/**
 * Gets shortage display with proper prioritization and formatting
 * Priority: shortageKg > conversion_shortage_kg > 0
 */
export const getShortageDisplay = (item: any): string | null => {
  try {
    // Priority: shortageKg over conversion_shortage_kg
    const shortageKg = item.shortageKg ?? item.conversion_shortage_kg ?? 0;
    const shortage = Number(shortageKg);

    // Only show shortage if it's greater than 0
    if (shortage > 0) {
      return `⚠️ Shortage: ${shortage.toFixed(2)}kg`;
    }

    return null;
  } catch (error) {
    console.error('Error calculating shortage display:', error);
    return '⚠️ Shortage: 0.00kg'; // Fallback
  }
};

/**
 * Gets packaging display in "source → target" format with proper fallbacks
 */
export const getPackagingDisplay = (item: any): string => {
  try {
    if (item.movementType !== 'palti') {
      // For non-palti entries, show regular packaging
      return item.packagingBrand || item.packaging?.brandName || 'A1';
    }

    // For palti entries, show "source → target" format
    const sourcePackaging = item.source_packaging_brand ||
      item.sourcePackaging?.brandName ||
      item.sourcePackagingBrand ||
      'A1';

    const targetPackaging = item.target_packaging_brand ||
      item.targetPackaging?.brandName ||
      item.targetPackagingBrand ||
      item.packagingBrand ||
      item.packaging?.brandName ||
      'A1';

    return `${sourcePackaging} → ${targetPackaging}`;
  } catch (error) {
    console.error('Error formatting packaging display:', error);
    return 'A1 → A1'; // Fallback
  }
};

/**
 * Gets bill number display with palti-specific logic
 */
export const getBillNumberDisplay = (item: any): string => {
  // Palti entries should always show "-" for bill numbers
  if (item.movementType === 'palti') {
    return '-';
  }

  return item.billNumber || '-';
};

/**
 * Gets lorry number display with proper fallbacks
 */
export const getLorryNumberDisplay = (item: any): string => {
  if (item.movementType === 'palti') {
    return item.lorryNumber || '-';
  }

  return item.lorryNumber || item.billNumber || '-';
};

/**
 * Gets variety display with fallback
 */
export const getVarietyDisplay = (item: any): string => {
  return item.variety || 'Sum25 RNR Raw';
};

/**
 * Gets bags display in "source → target" format for palti entries
 */
export const getBagsDisplay = (item: any): string => {
  try {
    if (item.movementType !== 'palti') {
      return item.bags || '0';
    }

    // For palti entries, show "source → target" format
    const sourceBags = item.sourceBags || item.bags || '0';
    const targetBags = item.bags || '0';
    const sourceSize = item.sourcePackaging?.allottedKg || item.sourcePackagingKg || item.source_packaging_kg || '-';
    const targetSize = item.bagSizeKg || item.packaging?.allottedKg || item.packaging_kg || item.bag_size_kg || '-';

    return `${sourceBags}/${sourceSize}kg → ${targetBags}/${targetSize}kg`;
  } catch (error) {
    console.error('Error formatting bags display:', error);
    return item.bags || '0';
  }
};

/**
 * Gets quantity display with proper formatting
 */
export const getQuantityDisplay = (item: any): string => {
  const quantity = Number(item.quantityQuintals);
  return isNaN(quantity) ? '0.00' : quantity.toFixed(2);
};

/**
 * Gets location display with fallbacks
 */
export const getLocationDisplay = (item: any, field: 'from' | 'to'): string => {
  if (field === 'from') {
    return item.from || item.fromLocation || item.locationCode || '-';
  } else {
    return item.to || item.toLocation || item.locationCode || '-';
  }
};

/**
 * Gets movement type display with icon and color
 */
export const getMovementTypeDisplay = (item: any): { text: string; color: string } => {
  switch (item.movementType) {
    case 'production':
      return { text: '🏭 Production', color: 'inherit' };
    case 'purchase':
      return { text: '📦 Purchase', color: '#059669' };
    case 'sale':
      return { text: '💰 Sale', color: '#dc2626' };
    case 'palti':
      return { text: '🔄 Palti', color: '#f59e0b' };
    case 'unknown':
      return { text: '❓ Unknown', color: 'inherit' };
    default:
      return { text: item.movementType || '❓ Unknown', color: 'inherit' };
  }
};

/**
 * Gets row background color based on movement type
 */
export const getRowBackgroundColor = (item: any, index: number): string => {
  if (item.movementType === 'purchase') {
    return '#d4edda';
  } else if (item.movementType === 'sale') {
    return '#fee2e2';
  } else if (item.movementType === 'palti') {
    return '#fef3c7'; // Yellow background for palti entries
  } else if (index % 2 === 0) {
    return '#f8f9fa';
  }
  return 'white';
};

/**
 * Checks if an item is a palti movement
 */
export const isPaltiMovement = (item: any): boolean => {
  return item?.movementType?.toLowerCase() === 'palti';
};

/**
 * Gets comprehensive palti display data
 */
export const getPaltiDisplayData = (item: any) => {
  if (!isPaltiMovement(item)) {
    return null;
  }

  return {
    shortage: getShortageDisplay(item),
    packaging: getPackagingDisplay(item),
    billNumber: getBillNumberDisplay(item),
    lorryNumber: getLorryNumberDisplay(item),
    variety: getVarietyDisplay(item),
    quantity: getQuantityDisplay(item),
    fromLocation: getLocationDisplay(item, 'from'),
    toLocation: getLocationDisplay(item, 'to'),
    movementType: getMovementTypeDisplay(item),
    backgroundColor: getRowBackgroundColor(item, 0)
  };
};