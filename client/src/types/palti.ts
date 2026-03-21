/**
 * TypeScript type definitions for Palti (conversion) operations
 */

// Core palti movement interface
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
  sourcePackaging?: PackagingInfo;
  targetPackaging?: PackagingInfo;
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

// Packaging information structure
export interface PackagingInfo {
  brandName: string;
  allottedKg: number;
}

// Display components props
export interface PaltiRowProps {
  item: PaltiMovement;
  index: number;
  onEdit?: (item: PaltiMovement) => void;
}

export interface ShortageIndicatorProps {
  shortageKg: number;
  conversionShortageKg?: number;
}

export interface PackagingDisplayProps {
  sourcePackaging: string;
  targetPackaging: string;
  movementType: string;
}

// Data processing result
export interface PaltiProcessingResult {
  processed: PaltiMovement[];
  errors: Array<{
    rawData: any;
    error: string;
  }>;
  summary: {
    totalInput: number;
    totalProcessed: number;
    totalErrors: number;
  };
}

// Field extraction configuration
export interface FieldExtractionConfig {
  fieldNames: string[];
  fallback: any;
  parser?: (value: any) => any;
}

// Palti display configuration
export interface PaltiDisplayConfig {
  showShortage: boolean;
  showPackaging: boolean;
  useSourceTargetFormat: boolean;
  fallbackValues: {
    variety: string;
    packaging: string;
    location: string;
    billNumber: string;
  };
}

// Visual styling configuration
export interface PaltiVisualConfig {
  backgroundColor: string;
  textColor: string;
  shortageColor: string;
  hoverColor: string;
}

// Default configurations
export const DEFAULT_PALTI_DISPLAY_CONFIG: PaltiDisplayConfig = {
  showShortage: true,
  showPackaging: true,
  useSourceTargetFormat: true,
  fallbackValues: {
    variety: 'Sum25 RNR Raw',
    packaging: 'A1',
    location: '-',
    billNumber: '-'
  }
};

export const DEFAULT_PALTI_VISUAL_CONFIG: PaltiVisualConfig = {
  backgroundColor: '#fef3c7',
  textColor: '#f59e0b',
  shortageColor: '#d97706',
  hoverColor: '#fde68a'
};

// Error types
export class PaltiProcessingError extends Error {
  constructor(message: string, public rawData?: any) {
    super(message);
    this.name = 'PaltiProcessingError';
  }
}

export class PaltiValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'PaltiValidationError';
  }
}