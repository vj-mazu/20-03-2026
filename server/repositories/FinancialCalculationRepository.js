const FinancialCalculation = require('../models/FinancialCalculation');

class FinancialCalculationRepository {
  /**
   * Create financial calculation
   * @param {Object} calculationData - Financial calculation data
   * @returns {Promise<Object>} Created financial calculation
   */
  async create(calculationData) {
    const calculation = await FinancialCalculation.create(calculationData);
    return calculation.toJSON();
  }

  /**
   * Find financial calculation by inventory data ID
   * @param {number} inventoryDataId - Inventory data ID
   * @returns {Promise<Object|null>} Financial calculation or null
   */
  async findByInventoryDataId(inventoryDataId) {
    const calculation = await FinancialCalculation.findOne({
      where: { inventoryDataId }
    });
    return calculation ? calculation.toJSON() : null;
  }

  /**
   * Find financial calculation by ID
   * @param {number} id - Financial calculation ID
   * @returns {Promise<Object|null>} Financial calculation or null
   */
  async findById(id) {
    const calculation = await FinancialCalculation.findByPk(id);
    return calculation ? calculation.toJSON() : null;
  }

  /**
   * Update financial calculation
   * @param {number} id - Financial calculation ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated financial calculation or null
   */
  async update(id, updates) {
    const calculation = await FinancialCalculation.findByPk(id);
    if (!calculation) return null;
    
    await calculation.update(updates);
    return calculation.toJSON();
  }

  /**
   * Update financial calculation by inventory data ID
   * @param {number} inventoryDataId - Inventory data ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated financial calculation or null
   */
  async updateByInventoryDataId(inventoryDataId, updates) {
    const calculation = await FinancialCalculation.findOne({
      where: { inventoryDataId }
    });
    if (!calculation) return null;
    
    await calculation.update(updates);
    return calculation.toJSON();
  }
}

module.exports = new FinancialCalculationRepository();
