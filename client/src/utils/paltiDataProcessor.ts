/**
 * Palti Data Processing Utilities
 * 
 * This module provides utilities for processing palti (conversion) movement data
 * with support for multiple data formats and robust error handling.
 */

// Type definitions for palti movement data structures
export interface PaltiMovement {
  id: string | number;
  movementType: 'palti';
  date: string;
  variety: string;
  bags: number;
  bagSizeKg: number;
  quantityQuintals: number;
  
  // Shortage information
  shortageKg?: number;
  conversion_shortage_kg?: number;
  shortageBags?: number;
  conversion_shortage_bags?: number;
  
  // Packaging information
  source_packaging_brand?: string;
  target_packaging_brand?: string;
  sourcePackaging?: { brandName: string; allottedKg: number };
  targetPackaging?: { brandName: string; allottedKg: number };
  sourcePackagingBrand?: string;
  targetPackagingBrand?: string;
  sourcePackagingKg?: number;
  targetPackagingKg?: number;
  
  // Location information
  from?: string;
  to?: string;
  fromLocation?: string;
  toLocation?: string;
  locationCode?: string;
  lorryNumber?: string;
  billNumber?: string;
  
  // Visual grouping
  _isGrouped?: boolean;
  _groupCount?: number;
  
  // Status and metadata
  status?: string;
  createdBy?: string;
  approvedBy?: string;
  adminApprovedBy?: number;
  createdByAdmin?: boolean;
  partyName?: string;
}

// Raw data structure from API (supports multiple formats)
export interface RawPaltiData {
  // Core fields (multiple case variations)
  id?: string | number;
  ID?: string | number;
  movementType?: string;
  movement_type?: string;
  MovementType?: string;
  movementtype?: string;
  
  date?: string;
  DATE?: string;
  Date?: string;
  
  variety?: string;
  VARIETY?: string;
  Variety?: string;
  
  bags?: number | string;
  BAGS?: number | string;
  Bags?: number | string;
  
  bagSizeKg?: number | string;
  bag_size_kg?: number | string;
  bagsizekg?: number | string;
  BagSizeKg?: number | string;
  
  quantityQuintals?: number | string;
  quantity_quintals?: number | string;
  quantityquintals?: number | string;
  QuantityQuintals?: number | string;
  
  // Shortage fields
  shortageKg?: number | string;
  conversionShortageKg?: number | string;
  conversion_shortage_kg?: number | string;
  shortageBags?: number | string;
  conversionShortageBags?: number | string;
  conversion_shortage_bags?: number | string;
  
  // Packaging fields (camelCase)
  sourcePackagingBrand?: string;
  targetPackagingBrand?: string;
  sourcePackagingKg?: number | string;
  targetPackagingKg?: number | string;
  packagingBrand?: string;
  packagingKg?: number | string;
  
  // Packaging fields (snake_case)
  source_packaging_brand?: string;
  target_packaging_brand?: string;
  source_packaging_kg?: number | string;
  target_packaging_kg?: number | string;
  packaging_brand?: string;
  packaging_kg?: number | string;
  
  // Packaging fields (lowercase)
  sourcepackagingbrand?: string;
  targetpackagingbrand?: string;
  packagingbrand?: string;
  packagingkg?: number | string;
  
  // Nested packaging structures
  sourcePackaging?: { brandName: string; allottedKg: number };
  targetPackaging?: { brandName: string; allottedKg: number };
  packaging?: { brandName: string; allottedKg: number };
  
  // Location fields
  locationCode?: string;
  location_code?: string;
  locationcode?: string;
  LocationCode?: string;
  
  fromLocation?: string;
  from_location?: string;
  fromlocation?: string;
  FromLocation?: string;
  from?: string;
  
  toLocation?: string;
  to_location?: string;
  tolocation?: string;
  ToLocation?: string;
  to?: string;
  
  lorryNumber?: string;
  lorry_number?: string;
  lorrynumber?: string;
  LorryNumber?: string;
  
  billNumber?: string;
  bill_number?: string;
  billnumber?: string;
  BillNumber?: string;
  
  // Status and metadata
  status?: string;
  STATUS?: string;
  Status?: string;
  
  createdByUsername?: string;
  created_by_username?: string;
  createdbyusername?: string;
  
  approvedByUsername?: string;
  approved_by_username?: string;
  
  adminApprovedBy?: number;
  admin_approved_by?: number;
  
  createdByRole?: string;
  created_by_role?: string;
  
  partyName?: string;
  party_name?: string;
  partyname?: string;
}

/**
 * Safely extracts numeric values with fallback
 */
export const safeParseNumber = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Safely extracts integer values with fallback
 */
export const safeParseInt = (value: any, fallback: number = 0): number => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  
  const parsed = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return isNaN(parsed) ? fallback : parsed;
};

/**
 * Safely extracts string values with fallback
 */
export const safeParseString = (value: any, fallback: string = ''): string => {
  if (value === null || value === undefined) {
    return fallback;
  }
  
  return String(value).trim() || fallback;
};

/**
 * Extracts field value from multiple possible field names (case-insensitive)
 */
export const extractField = (data: any, fieldNames: string[], fallback: any = null): any => {
  for (const fieldName of fieldNames) {
    if (data[fieldName] !== undefined && data[fieldName] !== null) {
      return data[fieldName];
    }
  }
  return fallback;
};

/**
 * Normalizes palti movement data from various API formats
 */
export const normalizePaltiMovement = (rawData: RawPaltiData): PaltiMovement => {
  try {
    // Extract core fields with multiple format support
    const id = extractField(rawData, ['id', 'ID'], '');
    const movementType = extractField(rawData, [
      'movementType', 'movement_type', 'MovementType', 'movementtype'
    ], 'palti').toLowerCase();
    
    // Validate this is actually a palti movement
    if (movementType !== 'palti') {
      throw new Error(`Invalid movement type: ${movementType}. Expected 'palti'.`);
    }
    
    const date = safeParseString(extractField(rawData, ['date', 'DATE', 'Date']), '');
    const variety = safeParseString(extractField(rawData, ['variety', 'VARIETY', 'Variety']), 'Sum25 RNR Raw');
    
    // Extract numeric fields
    const bags = safeParseInt(extractField(rawData, ['bags', 'BAGS', 'Bags']), 0);
    const bagSizeKg = safeParseNumber(extractField(rawData, [
      'bagSizeKg', 'bag_size_kg', 'bagsizekg', 'BagSizeKg'
    ]), 26);
    
    let quantityQuintals = safeParseNumber(extractField(rawData, [
      'quantityQuintals', 'quantity_quintals', 'quantityquintals', 'QuantityQuintals'
    ]), 0);
    
    // Calculate quantityQuintals if missing/zero
    if (quantityQuintals === 0 && bags > 0 && bagSizeKg > 0) {
      quantityQuintals = (bags * bagSizeKg) / 100;
    }
    
    // Extract shortage information with priority: shortageKg > conversion_shortage_kg
    const shortageKg = safeParseNumber(extractField(rawData, [
      'shortageKg', 'conversionShortageKg', 'conversion_shortage_kg'
    ]), 0);
    
    const shortageBags = safeParseNumber(extractField(rawData, [
      'shortageBags', 'conversionShortageBags', 'conversion_shortage_bags'
    ]), 0);
    
    // Extract packaging information with multiple format support
    const sourcePackagingBrand = safeParseString(extractField(rawData, [
      'sourcePackagingBrand', 'source_packaging_brand', 'sourcepackagingbrand'
    ]) || rawData.sourcePackaging?.brandName, 'A1');
    
    const targetPackagingBrand = safeParseString(extractField(rawData, [
      'targetPackagingBrand', 'target_packaging_brand', 'targetpackagingbrand',
      'packagingBrand', 'packaging_brand', 'packagingbrand'
    ]) || rawData.targetPackaging?.brandName || rawData.packaging?.brandName, 'A1');
    
    const sourcePackagingKg = safeParseNumber(extractField(rawData, [
      'sourcePackagingKg', 'source_packaging_kg'
    ]) || rawData.sourcePackaging?.allottedKg, 26);
    
    const targetPackagingKg = safeParseNumber(extractField(rawData, [
      'targetPackagingKg', 'target_packaging_kg', 'packagingKg', 'packaging_kg', 'packagingkg'
    ]) || rawData.targetPackaging?.allottedKg || rawData.packaging?.allottedKg, bagSizeKg);
    
    // Extract location information
    const locationCode = safeParseString(extractField(rawData, [
      'locationCode', 'location_code', 'locationcode', 'LocationCode'
    ]), '');
    
    const fromLocation = safeParseString(extractField(rawData, [
      'fromLocation', 'from_location', 'fromlocation', 'FromLocation', 'from'
    ]) || locationCode, 'Source');
    
    const toLocation = safeParseString(extractField(rawData, [
      'toLocation', 'to_location', 'tolocation', 'ToLocation', 'to'
    ]), 'Target');
    
    const lorryNumber = safeParseString(extractField(rawData, [
      'lorryNumber', 'lorry_number', 'lorrynumber', 'LorryNumber'
    ]), '');
    
    const billNumber = safeParseString(extractField(rawData, [
      'billNumber', 'bill_number', 'billnumber', 'BillNumber'
    ]), '');
    
    // Extract status and metadata
    const status = safeParseString(extractField(rawData, ['status', 'STATUS', 'Status']), '');
    const createdBy = safeParseString(extractField(rawData, [
      'createdByUsername', 'created_by_username', 'createdbyusername'
    ]), '');
    const approvedBy = safeParseString(extractField(rawData, [
      'approvedByUsername', 'approved_by_username'
    ]), '');
    const adminApprovedBy = safeParseInt(extractField(rawData, [
      'adminApprovedBy', 'admin_approved_by'
    ]), 0);
    const createdByRole = safeParseString(extractField(rawData, [
      'createdByRole', 'created_by_role'
    ]), '');
    const partyName = safeParseString(extractField(rawData, [
      'partyName', 'party_name', 'partyname'
    ]), '');
    
    // Build normalized palti movement object
    const normalized: PaltiMovement = {
      id: `movement-${id}`,
      movementType: 'palti',
      date,
      variety,
      bags,
      bagSizeKg,
      quantityQuintals,
      
      // Shortage information
      shortageKg,
      conversion_shortage_kg: shortageKg, // Keep both for compatibility
      shortageBags,
      conversion_shortage_bags: shortageBags,
      
      // Packaging information (multiple formats for compatibility)
      source_packaging_brand: sourcePackagingBrand,
      target_packaging_brand: targetPackagingBrand,
      sourcePackaging: {
        brandName: sourcePackagingBrand,
        allottedKg: sourcePackagingKg
      },
      targetPackaging: {
        brandName: targetPackagingBrand,
        allottedKg: targetPackagingKg
      },
      sourcePackagingBrand,
      targetPackagingBrand,
      sourcePackagingKg,
      targetPackagingKg,
      
      // Location information
      from: fromLocation,
      to: toLocation,
      fromLocation,
      toLocation,
      locationCode,
      lorryNumber,
      billNumber: billNumber || '-', // Palti entries should show "-" for bill numbers
      
      // Status and metadata
      status,
      createdBy,
      approvedBy,
      adminApprovedBy: adminApprovedBy || undefined,
      createdByAdmin: createdByRole === 'admin',
      partyName
    };
    
    return normalized;
    
  } catch (error) {
    console.error('Error normalizing palti movement:', error, rawData);
    
    // Return fallback object with safe defaults
    return {
      id: `movement-${rawData.id || rawData.ID || 'unknown'}`,
      movementType: 'palti',
      date: safeParseString(rawData.date || rawData.DATE || rawData.Date, ''),
      variety: 'Sum25 RNR Raw',
      bags: 0,
      bagSizeKg: 26,
      quantityQuintals: 0,
      shortageKg: 0,
      source_packaging_brand: 'A1',
      target_packaging_brand: 'A1',
      sourcePackaging: { brandName: 'A1', allottedKg: 26 },
      targetPackaging: { brandName: 'A1', allottedKg: 26 },
      from: 'Source',
      to: 'Target',
      fromLocation: 'Source',
      toLocation: 'Target',
      locationCode: '',
      lorryNumber: '',
      billNumber: '-',
      status: '',
      createdBy: '',
      approvedBy: ''
    };
  }
};

/**
 * Processes an array of raw palti movements and returns normalized data
 */
export const processPaltiMovements = (rawMovements: RawPaltiData[]): PaltiMovement[] => {
  if (!Array.isArray(rawMovements)) {
    console.warn('processPaltiMovements: Expected array, got:', typeof rawMovements);
    return [];
  }
  
  const processed: PaltiMovement[] = [];
  
  for (const rawMovement of rawMovements) {
    try {
      // Check if this is a palti movement
      const movementType = extractField(rawMovement, [
        'movementType', 'movement_type', 'MovementType', 'movementtype'
      ], '').toLowerCase();
      
      if (movementType === 'palti') {
        const normalized = normalizePaltiMovement(rawMovement);
        processed.push(normalized);
      }
    } catch (error) {
      console.error('Error processing palti movement:', error, rawMovement);
      // Continue processing other movements
    }
  }
  
  console.log(`✅ Processed ${processed.length} palti movements from ${rawMovements.length} raw movements`);
  return processed;
};

/**
 * Validates if a movement is a valid palti entry
 */
export const isPaltiMovement = (movement: any): boolean => {
  if (!movement) return false;
  
  const movementType = extractField(movement, [
    'movementType', 'movement_type', 'MovementType', 'movementtype'
  ], '').toLowerCase();
  
  return movementType === 'palti';
};

/**
 * Gets display-ready shortage information
 */
export const getShortageDisplay = (movement: PaltiMovement): string | null => {
  const shortage = movement.shortageKg || movement.conversion_shortage_kg || 0;
  
  if (shortage > 0) {
    return `⚠️ Shortage: ${shortage.toFixed(2)}kg`;
  }
  
  return null;
};

/**
 * Gets display-ready packaging information in "source → target" format
 */
export const getPackagingDisplay = (movement: PaltiMovement): string => {
  const sourcePackaging = movement.source_packaging_brand || 
                         movement.sourcePackaging?.brandName || 
                         movement.sourcePackagingBrand || 
                         'A1';
  
  const targetPackaging = movement.target_packaging_brand || 
                         movement.targetPackaging?.brandName || 
                         movement.targetPackagingBrand || 
                         'A1';
  
  return `${sourcePackaging} → ${targetPackaging}`;
};

/**
 * Gets fallback values for missing palti data fields
 */
export const getPaltiFieldFallbacks = () => {
  return {
    variety: 'Sum25 RNR Raw',
    quantity: '0.00',
    billNumber: '-',
    location: '-',
    packaging: 'A1',
    shortage: '0.00kg'
  };
};

/**
 * Handles both camelCase and snake_case field names for compatibility
 */
export const getCompatibleFieldValue = (obj: any, camelCaseField: string, snakeCaseField: string, fallback: any = null): any => {
  return obj[camelCaseField] ?? obj[snakeCaseField] ?? fallback;
};