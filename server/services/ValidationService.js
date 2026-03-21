class ValidationService {
  /**
   * Validate required fields
   * @param {Object} data - Data object to validate
   * @param {Array<string>} requiredFields - Array of required field names
   * @returns {Object} Validation result
   */
  validateRequiredFields(data, requiredFields) {
    const errors = [];
    const missing = [];

    for (const field of requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field);
        errors.push(`Field '${field}' is required`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      missing
    };
  }

  /**
   * Validate numeric range
   * @param {number} value - Value to validate
   * @param {Object} range - Range constraints
   * @param {number} range.min - Minimum value (inclusive)
   * @param {number} range.max - Maximum value (inclusive)
   * @param {string} fieldName - Field name for error messages
   * @returns {Object} Validation result
   */
  validateNumericRange(value, range, fieldName = 'value') {
    const errors = [];

    const numValue = (typeof value === 'string' && value.trim() !== '') ? Number(value) : value;

    if (numValue === null || numValue === undefined || typeof numValue !== 'number' || isNaN(numValue)) {
      errors.push(`${fieldName} must be a valid number`);
      return { valid: false, errors };
    }

    const val = numValue;

    if (range.min !== undefined && val < range.min) {
      errors.push(`${fieldName} must be at least ${range.min}`);
    }

    if (range.max !== undefined && val > range.max) {
      errors.push(`${fieldName} must be at most ${range.max}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate weights (gross weight must be greater than tare weight)
   * @param {number} grossWeight - Gross weight
   * @param {number} tareWeight - Tare weight
   * @returns {Object} Validation result
   */
  validateWeights(grossWeight, tareWeight) {
    const errors = [];

    if (typeof grossWeight !== 'number' || isNaN(grossWeight)) {
      errors.push('Gross weight must be a valid number');
    }

    if (typeof tareWeight !== 'number' || isNaN(tareWeight)) {
      errors.push('Tare weight must be a valid number');
    }

    if (errors.length === 0) {
      if (grossWeight <= 0) {
        errors.push('Gross weight must be greater than 0');
      }

      if (tareWeight < 0) {
        errors.push('Tare weight cannot be negative');
      }

      if (tareWeight >= grossWeight) {
        errors.push('Tare weight must be less than gross weight');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      netWeight: errors.length === 0 ? grossWeight - tareWeight : null
    };
  }

  /**
   * Validate file upload
   * @param {Object} file - File object
   * @param {Object} constraints - File constraints
   * @param {Array<string>} constraints.allowedTypes - Allowed MIME types
   * @param {number} constraints.maxSize - Maximum file size in bytes
   * @returns {Object} Validation result
   */
  validateFileUpload(file, constraints = {}) {
    const {
      allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
      maxSize = 10 * 1024 * 1024 // 10MB
    } = constraints;

    const errors = [];

    if (!file) {
      errors.push('No file provided');
      return { valid: false, errors };
    }

    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      errors.push(`File size exceeds ${maxSizeMB}MB limit`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate quality parameters
   * @param {Object} qualityData - Quality parameters data
   * @returns {Object} Validation result
   */
  validateQualityParameters(qualityData) {
    const errors = [];

    // Validate moisture (0-100%)
    const moistureValidation = this.validateNumericRange(
      qualityData.moisture,
      { min: 0, max: 100 },
      'Moisture'
    );
    if (!moistureValidation.valid) {
      errors.push(...moistureValidation.errors);
    }

    // Validate smell (optional)
    if (qualityData.smellHas === true) {
      const smellType = String(qualityData.smellType || '').trim();
      if (!smellType) {
        errors.push('Smell type is required');
      }
    }

    // Validate cutting columns (0-100%)
    if (qualityData.cutting1 !== undefined) {
      const cutting1Validation = this.validateNumericRange(
        qualityData.cutting1,
        { min: 0, max: 100 },
        'Cutting 1'
      );
      if (!cutting1Validation.valid) {
        errors.push(...cutting1Validation.errors);
      }
    }

    if (qualityData.cutting2 !== undefined) {
      const cutting2Validation = this.validateNumericRange(
        qualityData.cutting2,
        { min: 0, max: 100 },
        'Cutting 2'
      );
      if (!cutting2Validation.valid) {
        errors.push(...cutting2Validation.errors);
      }
    }

    // Validate other numeric fields (non-negative)
    const alphaAllowedFields = new Set(['mixS', 'mixL', 'mix', 'kandu', 'oil', 'sk']);
    const numericFields = [
      'bend', 'grainsCount',
      'wbR', 'wbBk', 'wbT', 'paddyWb'
    ];

    for (const field of alphaAllowedFields) {
      if (qualityData[field] !== undefined) {
        const raw = String(qualityData[field] ?? '').trim();
        if (!raw) {
          continue;
        }
        if (/[a-zA-Z]/.test(raw)) {
          continue;
        }
        const validation = this.validateNumericRange(
          qualityData[field],
          { min: 0 },
          field
        );
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
      }
    }

    for (const field of numericFields) {
      if (qualityData[field] !== undefined) {
        const validation = this.validateNumericRange(
          qualityData[field],
          { min: 0 },
          field
        );
        if (!validation.valid) {
          errors.push(...validation.errors);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate sample entry data
   * @param {Object} entryData - Sample entry data
   * @returns {Object} Validation result
   */
  validateSampleEntry(entryData) {
    const isReadyLorry = entryData.entryType === 'DIRECT_LOADED_VEHICLE' || entryData.entryType === 'READY_LORRY';
    let requiredFields = ['entryDate', 'brokerName', 'variety', 'location', 'bags', 'packaging', 'sampleCollectedBy'];
    if (!isReadyLorry) {
      requiredFields.push('partyName');
    }

    // Ready Lorry requires lorry number
    if (isReadyLorry) {
      requiredFields.push('lorryNumber');
    }

    // Location sample should include GPS coordinates (photos optional, smell optional)
    if (entryData.entryType === 'LOCATION_SAMPLE') {
      requiredFields.push('gpsCoordinates');
    }

    const requiredValidation = this.validateRequiredFields(entryData, requiredFields);
    if (!requiredValidation.valid) {
      return requiredValidation;
    }

    const errors = [];

    // Validate bags (must be positive integer)
    if (!Number.isInteger(entryData.bags) || entryData.bags <= 0) {
      errors.push('Bags must be a positive integer');
    }

    // Validate date
    if (!(entryData.entryDate instanceof Date) && isNaN(Date.parse(entryData.entryDate))) {
      errors.push('Invalid date format');
    }

    // Validate entry type if provided
    if (entryData.entryType && !['CREATE_NEW', 'DIRECT_LOADED_VEHICLE', 'NEW_PADDY_SAMPLE', 'READY_LORRY', 'LOCATION_SAMPLE', 'RICE_SAMPLE'].includes(entryData.entryType)) {
      errors.push('Invalid entry type');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate inventory data
   * @param {Object} inventoryData - Inventory data
   * @returns {Object} Validation result
   */
  validateInventoryData(inventoryData) {
    const requiredFields = ['date', 'variety', 'bags', 'moisture', 'wbNumber', 'grossWeight', 'tareWeight', 'location'];

    const requiredValidation = this.validateRequiredFields(inventoryData, requiredFields);
    if (!requiredValidation.valid) {
      return requiredValidation;
    }

    const errors = [];

    // Validate weights
    const weightsValidation = this.validateWeights(
      inventoryData.grossWeight,
      inventoryData.tareWeight
    );
    if (!weightsValidation.valid) {
      errors.push(...weightsValidation.errors);
    }

    // Validate bags
    if (!Number.isInteger(inventoryData.bags) || inventoryData.bags <= 0) {
      errors.push('Bags must be a positive integer');
    }

    // Validate moisture
    const moistureValidation = this.validateNumericRange(
      inventoryData.moisture,
      { min: 0, max: 100 },
      'Moisture'
    );
    if (!moistureValidation.valid) {
      errors.push(...moistureValidation.errors);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate financial calculation inputs
   * @param {Object} financialData - Financial calculation data
   * @returns {Object} Validation result
   */
  validateFinancialCalculation(financialData) {
    const errors = [];

    // Validate sute rate
    if (financialData.suteRate != null) {
      const suteValidation = this.validateNumericRange(
        financialData.suteRate,
        { min: 0 },
        'Sute Rate'
      );
      if (!suteValidation.valid) {
        errors.push(...suteValidation.errors);
      }
    }

    // Validate base rate
    if (financialData.baseRate != null || financialData.baseRateValue != null) {
      const rateVal = financialData.baseRateValue != null ? financialData.baseRateValue : financialData.baseRate;
      const baseRateValidation = this.validateNumericRange(
        rateVal,
        { min: 0 },
        'Base Rate'
      );
      if (!baseRateValidation.valid) {
        errors.push(...baseRateValidation.errors);
      }
    }

    // Validate custom divisor (if MD/Loose type)
    if (financialData.customDivisor != null) {
      const divisorValidation = this.validateNumericRange(
        financialData.customDivisor,
        { min: 1, max: 1000 },
        'Custom Divisor'
      );
      if (!divisorValidation.valid) {
        errors.push(...divisorValidation.errors);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = new ValidationService();
