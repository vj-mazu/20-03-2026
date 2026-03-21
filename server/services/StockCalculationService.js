const { Op } = require('sequelize');
const Arrival = require('../models/Arrival');

/**
 * Calculate the current stock quantity for a kunchinittu
 * @param {number} kunchinintuId - The ID of the kunchinittu
 * @param {number} excludeArrivalId - Optional arrival ID to exclude from calculation
 * @returns {Promise<{quantity: number, netWeight: number}>} Stock quantity in quintals and kg
 */
async function calculateKunchinintuStock(kunchinintuId, excludeArrivalId = null) {
  try {
    // Build where clause for arrivals TO this kunchinittu
    const arrivalsWhere = {
      toKunchinintuId: kunchinintuId,
      status: 'approved',
      adminApprovedBy: { [Op.not]: null }
    };
    
    // Exclude the current arrival if specified
    if (excludeArrivalId) {
      arrivalsWhere.id = { [Op.ne]: excludeArrivalId };
    }
    
    // Get all arrivals TO this kunchinittu (approved by admin)
    const arrivals = await Arrival.sum('netWeight', {
      where: arrivalsWhere
    }) || 0;
    
    // Get all shiftings FROM this kunchinittu (approved by admin)
    const shiftings = await Arrival.sum('netWeight', {
      where: {
        fromKunchinintuId: kunchinintuId,
        movementType: 'shifting',
        status: 'approved',
        adminApprovedBy: { [Op.not]: null }
      }
    }) || 0;
    
    // Get all production-shiftings FROM this kunchinittu (approved by admin)
    const productionShiftings = await Arrival.sum('netWeight', {
      where: {
        fromKunchinintuId: kunchinintuId,
        movementType: 'production-shifting',
        status: 'approved',
        adminApprovedBy: { [Op.not]: null }
      }
    }) || 0;
    
    // Calculate net weight in kg
    const netWeightKg = arrivals - shiftings - productionShiftings;
    
    // Convert to quintals (1 quintal = 100 kg)
    const quantityQuintals = netWeightKg / 100;
    
    return {
      quantity: quantityQuintals,
      netWeight: netWeightKg
    };
  } catch (error) {
    console.error('Error calculating kunchinittu stock:', error);
    
    // Add more context to the error
    if (error.name === 'SequelizeConnectionError') {
      const dbError = new Error('Database connection failed while calculating stock');
      dbError.originalError = error;
      throw dbError;
    }
    
    throw error;
  }
}

module.exports = {
  calculateKunchinintuStock
};

/**
 * Calculate weighted average rate for kunchinittu
 * @param {number} existingQuantity - Existing quantity in quintals
 * @param {number} existingRate - Existing average rate per quintal
 * @param {number} shiftedQuantity - Shifted quantity in quintals
 * @param {number} sourceRate - Source kunchinittu average rate per quintal
 * @returns {number} New weighted average rate with two decimal precision
 */
function calculateWeightedAverage(existingQuantity, existingRate, shiftedQuantity, sourceRate) {
  // Handle edge case: destination kunchinittu is empty
  if (existingQuantity === 0 || existingQuantity === null) {
    return parseFloat(sourceRate.toFixed(2));
  }
  
  // Handle edge case: source has no rate
  if (!sourceRate || sourceRate === 0) {
    return parseFloat(existingRate.toFixed(2));
  }
  
  // Calculate weighted average
  // Formula: (existing_quantity × existing_rate + shifted_quantity × source_rate) ÷ (existing_quantity + shifted_quantity)
  const existingValue = existingQuantity * existingRate;
  const shiftedValue = shiftedQuantity * sourceRate;
  const totalQuantity = existingQuantity + shiftedQuantity;
  
  if (totalQuantity === 0) {
    return 0;
  }
  
  const newAverageRate = (existingValue + shiftedValue) / totalQuantity;
  
  // Return with two decimal precision
  return parseFloat(newAverageRate.toFixed(2));
}

module.exports = {
  calculateKunchinintuStock,
  calculateWeightedAverage
};
