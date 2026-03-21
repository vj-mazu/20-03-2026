const HamaliRate = require('../models/HamaliRate');

// Simple in-memory cache
let ratesCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class HamaliRatesService {
  /**
   * Get current hamali rates
   * @returns {Promise<Object>} Current hamali rates
   */
  async getCurrentRates() {
    try {
      // Check cache first
      if (ratesCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_DURATION)) {
        return ratesCache;
      }

      // Get the latest rate record
      const rates = await HamaliRate.findOne({
        order: [['createdAt', 'DESC']]
      });

      let result;
      if (!rates) {
        // Return default rates if none exist
        result = {
          loadingRate: 0,
          unloadingSadaRate: 0,
          unloadingKnRate: 0,
          looseTumbidduRate: 0
        };
      } else {
        result = {
          id: rates.id,
          loadingRate: parseFloat(rates.loadingRate),
          unloadingSadaRate: parseFloat(rates.unloadingSadaRate),
          unloadingKnRate: parseFloat(rates.unloadingKnRate),
          looseTumbidduRate: parseFloat(rates.looseTumbidduRate),
          createdAt: rates.createdAt,
          updatedAt: rates.updatedAt
        };
      }

      // Cache the result
      ratesCache = result;
      cacheTimestamp = Date.now();
      
      return result;
    } catch (error) {
      console.error('Error getting current rates:', error);
      throw new Error(`Failed to get current rates: ${error.message}`);
    }
  }

  /**
   * Create or update hamali rates
   * @param {Object} ratesData - Rates data
   * @returns {Promise<Object>} Created/updated rates
   */
  async saveRates(ratesData) {
    try {
      // Validate rates
      const validation = this.validateRates(ratesData);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // Check if rates exist
      const existingRates = await HamaliRate.findOne({
        order: [['createdAt', 'DESC']]
      });

      let rates;
      if (existingRates) {
        // Update existing rates
        await existingRates.update({
          loadingRate: ratesData.loadingRate,
          unloadingSadaRate: ratesData.unloadingSadaRate,
          unloadingKnRate: ratesData.unloadingKnRate,
          looseTumbidduRate: ratesData.looseTumbidduRate
        });
        rates = existingRates;
      } else {
        // Create new rates
        rates = await HamaliRate.create({
          loadingRate: ratesData.loadingRate,
          unloadingSadaRate: ratesData.unloadingSadaRate,
          unloadingKnRate: ratesData.unloadingKnRate,
          looseTumbidduRate: ratesData.looseTumbidduRate
        });
      }

      // Clear cache if implemented
      this.clearCache();

      return {
        id: rates.id,
        loadingRate: parseFloat(rates.loadingRate),
        unloadingSadaRate: parseFloat(rates.unloadingSadaRate),
        unloadingKnRate: parseFloat(rates.unloadingKnRate),
        looseTumbidduRate: parseFloat(rates.looseTumbidduRate),
        createdAt: rates.createdAt,
        updatedAt: rates.updatedAt
      };
    } catch (error) {
      console.error('Error saving rates:', error);
      throw new Error(`Failed to save rates: ${error.message}`);
    }
  }

  /**
   * Update specific rate
   * @param {number} id - Rate ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated rates
   */
  async updateRate(id, updateData) {
    try {
      const rates = await HamaliRate.findByPk(id);
      if (!rates) {
        throw new Error('Rates not found');
      }

      // Validate update data
      const validation = this.validateRates(updateData, true);
      if (!validation.isValid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      await rates.update(updateData);

      // Clear cache if implemented
      this.clearCache();

      return {
        id: rates.id,
        loadingRate: parseFloat(rates.loadingRate),
        unloadingSadaRate: parseFloat(rates.unloadingSadaRate),
        unloadingKnRate: parseFloat(rates.unloadingKnRate),
        looseTumbidduRate: parseFloat(rates.looseTumbidduRate),
        createdAt: rates.createdAt,
        updatedAt: rates.updatedAt
      };
    } catch (error) {
      console.error('Error updating rate:', error);
      throw new Error(`Failed to update rate: ${error.message}`);
    }
  }

  /**
   * Validate rates data
   * @param {Object} data - Rates data
   * @param {boolean} partial - Whether this is a partial update
   * @returns {Object} Validation result
   */
  validateRates(data, partial = false) {
    const errors = [];

    const rateFields = ['loadingRate', 'unloadingSadaRate', 'unloadingKnRate', 'looseTumbidduRate'];
    
    for (const field of rateFields) {
      if (!partial || data[field] !== undefined) {
        const value = data[field];
        
        if (value === undefined || value === null) {
          if (!partial) {
            errors.push(`${field} is required`);
          }
          continue;
        }

        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
          errors.push(`${field} must be a valid number`);
        } else if (numValue < 0) {
          errors.push(`${field} must be non-negative`);
        } else if (!this.isValidDecimal(numValue, 2)) {
          errors.push(`${field} can have at most 2 decimal places`);
        }
      }
    }

    // Check if at least one rate is greater than 0
    if (!partial) {
      const hasPositiveRate = rateFields.some(field => {
        const value = parseFloat(data[field]);
        return !isNaN(value) && value > 0;
      });

      if (!hasPositiveRate) {
        errors.push('At least one rate must be greater than 0');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a number has valid decimal places
   * @param {number} num - Number to check
   * @param {number} maxDecimals - Maximum decimal places
   * @returns {boolean} Whether the number is valid
   */
  isValidDecimal(num, maxDecimals) {
    const str = num.toString();
    const decimalIndex = str.indexOf('.');
    
    if (decimalIndex === -1) {
      return true; // No decimal places
    }
    
    const decimalPlaces = str.length - decimalIndex - 1;
    return decimalPlaces <= maxDecimals;
  }

  /**
   * Clear cache
   */
  clearCache() {
    ratesCache = null;
    cacheTimestamp = null;
  }

  /**
   * Calculate hamali totals based on rates
   * @param {Object} params - Calculation parameters
   * @returns {Object} Calculated totals
   */
  calculateTotals(params) {
    const { bags, rates, hamaliTypes } = params;
    const totals = {};

    if (hamaliTypes.hasLoadingHamali) {
      totals.loadingTotal = bags * rates.loadingRate;
    }

    if (hamaliTypes.hasUnloadingHamali) {
      const rate = hamaliTypes.unloadingType === 'sada' 
        ? rates.unloadingSadaRate 
        : rates.unloadingKnRate;
      totals.unloadingTotal = bags * rate;
    }

    if (hamaliTypes.hasLooseTumbiddu && hamaliTypes.looseBags) {
      totals.looseTotal = hamaliTypes.looseBags * rates.looseTumbidduRate;
    }

    totals.grandTotal = (totals.loadingTotal || 0) + 
                        (totals.unloadingTotal || 0) + 
                        (totals.looseTotal || 0);

    return totals;
  }
}

module.exports = new HamaliRatesService();
