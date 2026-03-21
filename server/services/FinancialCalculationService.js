const FinancialCalculationRepository = require('../repositories/FinancialCalculationRepository');
const InventoryDataRepository = require('../repositories/InventoryDataRepository');
const FinancialCalculator = require('./FinancialCalculator');
const ValidationService = require('./ValidationService');
const AuditService = require('./AuditService');
const WorkflowEngine = require('./WorkflowEngine');
const SampleEntry = require('../models/SampleEntry');

class FinancialCalculationService {
  /**
   * Create financial calculation (Owner/Admin phase)
   */
  async createFinancialCalculation(calculationData, userId, userRole) {
    try {
      console.log('=== FinancialCalculationService.createFinancialCalculation ===');

      const validation = ValidationService.validateFinancialCalculation(calculationData);
      console.log('Validation result:', validation);

      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      console.log('Looking for inventory with ID:', calculationData.inventoryDataId);
      const inventory = await InventoryDataRepository.findById(calculationData.inventoryDataId);
      console.log('Found inventory:', inventory);

      if (!inventory) {
        throw new Error('Inventory data not found with ID: ' + calculationData.inventoryDataId);
      }

      const calculationContext = {
        actualNetWeight: inventory.netWeight,
        bags: inventory.bags,
        suteType: calculationData.suteType,
        suteRate: calculationData.suteRate,
        baseRateType: calculationData.baseRateType,
        baseRateUnit: calculationData.baseRateUnit,
        baseRateValue: calculationData.baseRateValue || calculationData.baseRate,
        customDivisor: calculationData.customDivisor,
        brokerageUnit: calculationData.brokerageUnit,
        brokerageRate: calculationData.brokerageRate,
        egbRate: calculationData.egbRate,
        lfinUnit: calculationData.lfinUnit || 'PER_BAG',
        lfinRate: calculationData.lfinRate || 0,
        hamaliUnit: calculationData.hamaliUnit || 'PER_BAG',
        hamaliRate: calculationData.hamaliRate || 0
      };

      console.log('Calculation context:', calculationContext);
      const result = FinancialCalculator.calculateComplete(calculationContext);
      console.log('Calculation result:', result);

      const finalData = {
        ...calculationData,
        ...result,
        inventoryDataId: calculationData.inventoryDataId,
        ownerCalculatedBy: userId,
        calculationType: 'OWNER'
      };

      console.log('Final data to save:', finalData);
      const calculation = await FinancialCalculationRepository.create(finalData);
      console.log('Created calculation:', calculation.id);

      await AuditService.logCreate(userId, 'financial_calculations', calculation.id, calculation);

      // Check current workflow status
      const sampleEntry = await SampleEntry.findByPk(calculationData.sampleEntryId);
      const currentStatus = sampleEntry.workflowStatus;
      console.log('Current workflow status:', currentStatus);

      // Transition based on current status:
      // - INVENTORY_ENTRY -> OWNER_FINANCIAL (first time)
      // - OWNER_FINANCIAL -> OWNER_FINANCIAL (re-entry, new lorry added)
      // - MANAGER_FINANCIAL -> OWNER_FINANCIAL (re-entry, new lorry added)
      // - FINAL_REVIEW -> OWNER_FINANCIAL (new lorry added)
      if (['INVENTORY_ENTRY', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW'].includes(currentStatus)) {
        try {
          console.log('Transitioning workflow for sampleEntryId:', calculationData.sampleEntryId);
          await WorkflowEngine.transitionTo(
            calculationData.sampleEntryId,
            'OWNER_FINANCIAL',
            userId,
            userRole,
            { financialCalculationId: calculation.id }
          );
          console.log('Workflow transitioned successfully to OWNER_FINANCIAL!');
        } catch (err) {
          console.log('Workflow transition error:', err.message);
          // Don't throw - financial calculation was saved successfully
        }
      } else {
        console.log('SKIPPING workflow transition - status is', currentStatus);
      }

      return calculation;

    } catch (error) {
      console.error('Error creating financial calculation:', error);
      throw error;
    }
  }

  /**
   * Create manager financial calculation
   */
  async createManagerFinancialCalculation(calculationData, userId, userRole) {
    try {
      const validation = ValidationService.validateFinancialCalculation(calculationData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      const inventory = await InventoryDataRepository.findById(calculationData.inventoryDataId);
      if (!inventory) {
        throw new Error('Inventory data not found');
      }

      const calculationContext = {
        actualNetWeight: inventory.netWeight,
        bags: inventory.bags,
        suteType: calculationData.suteType,
        suteRate: calculationData.suteRate,
        baseRateType: calculationData.baseRateType,
        baseRateUnit: calculationData.baseRateUnit,
        baseRateValue: calculationData.baseRateValue || calculationData.baseRate,
        customDivisor: calculationData.customDivisor,
        brokerageUnit: calculationData.brokerageUnit,
        brokerageRate: calculationData.brokerageRate,
        egbRate: calculationData.egbRate,
        lfinUnit: calculationData.lfinUnit || 'PER_BAG',
        lfinRate: calculationData.lfinRate || 0,
        hamaliUnit: calculationData.hamaliUnit || 'PER_BAG',
        hamaliRate: calculationData.hamaliRate || 0
      };

      const result = FinancialCalculator.calculateComplete(calculationContext);

      const finalData = {
        ...calculationData,
        ...result,
        managerCalculatedBy: userId,
        calculationType: 'MANAGER'
      };

      console.log('Manager financial saving for inventoryDataId:', calculationData.inventoryDataId);
      console.log('Final data to update/patch:', finalData);

      const calculation = await FinancialCalculationRepository.updateByInventoryDataId(
        calculationData.inventoryDataId,
        finalData
      );

      console.log('Update result ID:', calculation?.id);

      await AuditService.logCreate(userId, 'financial_calculations', calculation.id, calculation);

      // Check current status
      const sampleEntry = await SampleEntry.findByPk(calculationData.sampleEntryId);
      const currentStatus = sampleEntry.workflowStatus;
      console.log('Manager financial - current status:', currentStatus);

      // Transition based on current status:
      // - OWNER_FINANCIAL -> MANAGER_FINANCIAL -> FINAL_REVIEW

      // 1. Move to MANAGER_FINANCIAL if coming from OWNER_FINANCIAL
      if (currentStatus === 'OWNER_FINANCIAL') {
        try {
          await WorkflowEngine.transitionTo(
            calculationData.sampleEntryId,
            'MANAGER_FINANCIAL',
            userId,
            userRole,
            { managerFinancialCalculationId: calculation.id }
          );
          console.log('Transitioned to MANAGER_FINANCIAL');
        } catch (err) {
          console.log('Workflow transition error during MANAGER_FINANCIAL step:', err.message);
        }
      }

      // 2. Check if we can move to FINAL_REVIEW
      // We only move to FINAL_REVIEW if ALL inventory items for this sample entry have manager financial calculations
      try {
        const SampleEntryRepository = require('../repositories/SampleEntryRepository');
        const entry = await SampleEntryRepository.findById(calculationData.sampleEntryId, {
          includeAllotment: true,
          includeInspection: true,
          includeInventory: true,
          includeFinancial: true
        });

        const inspections = entry?.lotAllotment?.physicalInspections || [];
        const inventoryItems = inspections.map(i => i.inventoryData).filter(Boolean);

        // Count how many have manager financials (manager_calculated_by is not null)
        const itemsWithManagerFin = inventoryItems.filter(inv =>
          inv.financialCalculation && inv.financialCalculation.managerCalculatedBy !== null
        ).length;

        console.log(`Financial Progress: ${itemsWithManagerFin}/${inventoryItems.length} lorries completed`);

        if (inventoryItems.length > 0 && itemsWithManagerFin === inventoryItems.length) {
          console.log('All lorries complete! Moving to FINAL_REVIEW...');
          await WorkflowEngine.transitionTo(
            calculationData.sampleEntryId,
            'FINAL_REVIEW',
            userId,
            userRole,
            { managerFinancialCalculationId: calculation.id }
          );
        } else {
          console.log(`Staying in MANAGER_FINANCIAL - ${inventoryItems.length - itemsWithManagerFin} lorries pending`);
        }
      } catch (err) {
        console.log('Workflow transition error during FINAL_REVIEW check:', err.message);
      }

      console.log('Manager financial saved, current status was:', currentStatus);

      return calculation;

    } catch (error) {
      console.error('Error creating manager financial calculation:', error);
      throw error;
    }
  }

  async getFinancialCalculationByInventoryData(inventoryDataId) {
    return await FinancialCalculationRepository.findByInventoryDataId(inventoryDataId);
  }

  async updateFinancialCalculation(id, updates, userId) {
    try {
      const current = await FinancialCalculationRepository.findById(id);
      if (!current) {
        throw new Error('Financial calculation not found');
      }

      if (updates.suteRate || updates.baseRate || updates.brokerageRate ||
        updates.egbRate || updates.lfinRate || updates.hamaliRate) {

        const inventory = await InventoryDataRepository.findById(current.inventoryDataId);

        const calculationContext = {
          actualNetWeight: inventory.netWeight,
          bags: inventory.bags,
          suteType: updates.suteType || current.suteType,
          suteRate: updates.suteRate || current.suteRate,
          baseRateType: updates.baseRateType || current.baseRateType,
          baseRateUnit: updates.baseRateUnit || current.baseRateUnit,
          baseRateValue: updates.baseRateValue || updates.baseRate || current.baseRateValue || current.baseRate,
          customDivisor: updates.customDivisor || current.customDivisor,
          brokerageUnit: updates.brokerageUnit || current.brokerageUnit,
          brokerageRate: updates.brokerageRate || current.brokerageRate,
          egbRate: updates.egbRate || current.egbRate,
          lfinUnit: updates.lfinUnit || current.lfinUnit || 'PER_BAG',
          lfinRate: updates.lfinRate != null ? updates.lfinRate : current.lfinRate,
          hamaliUnit: updates.hamaliUnit || current.hamaliUnit || 'PER_BAG',
          hamaliRate: updates.hamaliRate != null ? updates.hamaliRate : current.hamaliRate
        };

        const result = FinancialCalculator.calculateComplete(calculationContext);
        updates = { ...updates, ...result };
      }

      const updated = await FinancialCalculationRepository.update(id, updates);

      await AuditService.logUpdate(userId, 'financial_calculations', id, current, updated);

      return updated;

    } catch (error) {
      console.error('Error updating financial calculation:', error);
      throw error;
    }
  }

  async recalculate(id, userId) {
    try {
      const current = await FinancialCalculationRepository.findById(id);
      if (!current) {
        throw new Error('Financial calculation not found');
      }

      const inventory = await InventoryDataRepository.findById(current.inventoryDataId);

      const calculationContext = {
        actualNetWeight: inventory.netWeight,
        bags: inventory.bags,
        suteType: current.suteType,
        suteRate: current.suteRate,
        baseRateType: current.baseRateType,
        baseRateUnit: current.baseRateUnit,
        baseRateValue: current.baseRateValue || current.baseRate,
        customDivisor: current.customDivisor,
        brokerageUnit: current.brokerageUnit,
        brokerageRate: current.brokerageRate,
        egbRate: current.egbRate,
        lfinUnit: current.lfinUnit || 'PER_BAG',
        lfinRate: current.lfinRate || 0,
        hamaliUnit: current.hamaliUnit || 'PER_BAG',
        hamaliRate: current.hamaliRate || 0
      };

      const result = FinancialCalculator.calculateComplete(calculationContext);

      return await this.updateFinancialCalculation(id, result, userId);

    } catch (error) {
      console.error('Error recalculating financial data:', error);
      throw error;
    }
  }
}

module.exports = new FinancialCalculationService();
