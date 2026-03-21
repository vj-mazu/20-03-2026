const { Op } = require('sequelize');
const InventoryData = require('../models/InventoryData');
const FinancialCalculation = require('../models/FinancialCalculation');
const PhysicalInspection = require('../models/PhysicalInspection');
const { sequelize } = require('../config/database');

class InventoryDataRepository {
  async create(inventoryData) {
    const inventory = await InventoryData.create(inventoryData);
    return inventory.toJSON();
  }

  async findByPhysicalInspectionId(physicalInspectionId, options = {}) {
    const include = [];

    if (options.includeFinancial) {
      include.push({ model: FinancialCalculation, as: 'financialCalculation' });
    }

    const inventory = await InventoryData.findOne({
      where: { physicalInspectionId },
      include
    });
    return inventory ? inventory.toJSON() : null;
  }

  async findById(id) {
    const inventory = await InventoryData.findByPk(id);
    return inventory ? inventory.toJSON() : null;
  }

  async update(id, updates) {
    const inventory = await InventoryData.findByPk(id);
    if (!inventory) return null;

    await inventory.update(updates);
    return inventory.toJSON();
  }

  async updateByPhysicalInspectionId(physicalInspectionId, updates) {
    const inventory = await InventoryData.findOne({
      where: { physicalInspectionId }
    });
    if (!inventory) return null;

    await inventory.update(updates);
    return inventory.toJSON();
  }

  // Count inventory records using raw SQL query
  async countBySampleEntryId(sampleEntryId) {
    try {
      const sql = `
        SELECT COUNT(*) as count 
        FROM inventory_data inv
        INNER JOIN physical_inspections pi ON inv.physical_inspection_id = pi.id
        WHERE pi.sample_entry_id = :sampleEntryId
      `;
      
      const result = await sequelize.query(sql, {
        replacements: { sampleEntryId: sampleEntryId },
        type: sequelize.QueryTypes.SELECT
      });
      
      return parseInt(result[0].count) || 0;
    } catch (error) {
      console.error('Error in countBySampleEntryId:', error);
      return 0;
    }
  }
}

module.exports = new InventoryDataRepository();
