const InventoryDataRepository = require('../repositories/InventoryDataRepository');
const ValidationService = require('./ValidationService');
const AuditService = require('./AuditService');
const WorkflowEngine = require('./WorkflowEngine');
const { Kunchinittu, Variety } = require('../models/Location');
const Outturn = require('../models/Outturn');
const SampleEntry = require('../models/SampleEntry');
const PhysicalInspection = require('../models/PhysicalInspection');

class InventoryDataService {
  async createInventoryData(inventoryData, userId, userRole) {
    try {
      const validation = ValidationService.validateInventoryData(inventoryData);
      if (!validation.valid) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      if (!inventoryData.physicalInspectionId) {
        throw new Error('Physical inspection ID is required');
      }

      inventoryData.recordedByUserId = userId;

      if (!inventoryData.entryDate && inventoryData.date) {
        inventoryData.entryDate = inventoryData.date;
      }

      // Variety validation
      const entryVariety = (inventoryData.variety || '').toLowerCase().trim();

      if (inventoryData.kunchinittuId) {
        const kunchinittu = await Kunchinittu.findByPk(inventoryData.kunchinittuId, {
          include: [{ model: Variety, as: 'variety', attributes: ['id', 'name'] }]
        });
        if (kunchinittu && kunchinittu.variety) {
          const kVariety = (kunchinittu.variety.name || '').toLowerCase().trim();
          if (kVariety && entryVariety && !entryVariety.includes(kVariety) && !kVariety.includes(entryVariety)) {
            throw new Error(`Variety mismatch: Entry variety "${inventoryData.variety}" does not match Kunchinittu "${kunchinittu.name}" variety "${kunchinittu.variety.name}". Please select a matching Kunchinittu.`);
          }
        }
      }

      if (inventoryData.outturnId) {
        const outturn = await Outturn.findByPk(inventoryData.outturnId);
        if (outturn && outturn.allottedVariety) {
          const oVariety = (outturn.allottedVariety || '').toLowerCase().trim();
          if (oVariety && entryVariety && !oVariety.includes(entryVariety) && !entryVariety.includes(oVariety)) {
            throw new Error(`Variety mismatch: Entry variety "${inventoryData.variety}" does not match Outturn "${outturn.code}" allotted variety "${outturn.allottedVariety}". Please select a matching Outturn.`);
          }
        }
      }

      inventoryData.netWeight = inventoryData.grossWeight - inventoryData.tareWeight;

      // Check current status and count of existing inventories
      const entry = await SampleEntry.findByPk(inventoryData.sampleEntryId);
      const currentStatus = entry.workflowStatus;
      console.log('Current status before saving:', currentStatus);

      // Check if this specific lorry already has inventory
      const existingForThisLorry = await InventoryDataRepository.findByPhysicalInspectionId(inventoryData.physicalInspectionId);

      // Check how many inventories already exist for this sample entry
      const allInspections = await PhysicalInspection.findAll({
        where: { sampleEntryId: inventoryData.sampleEntryId },
        attributes: ['id']
      });

      let existingInventoryCount = 0;
      for (const insp of allInspections) {
        const inv = await InventoryDataRepository.findByPhysicalInspectionId(insp.id);
        if (inv) existingInventoryCount++;
      }

      console.log('Existing inventories count:', existingInventoryCount);
      console.log('Is this a new lorry?', !existingForThisLorry);

      let inventory;
      if (existingForThisLorry) {
        // Update existing record (same lorry)
        console.log('Updating existing inventory for this lorry');
        inventory = await InventoryDataRepository.update(existingForThisLorry.id, inventoryData);
        await AuditService.logUpdate(userId, 'inventory_data', existingForThisLorry.id, existingForThisLorry, inventory);
      } else {
        // Create new inventory data
        inventory = await InventoryDataRepository.create(inventoryData);
        await AuditService.logCreate(userId, 'inventory_data', inventory.id, inventory);
      }

      // ========== DECIDE WHETHER TO TRANSITION ==========
      // KEY LOGIC:
      // - If status is PHYSICAL_INSPECTION -> go to INVENTORY_ENTRY (first or subsequent time)
      // - If adding new inventory (new lorry) at any intermediate/final stage -> go back to OWNER_FINANCIAL
      //   This ensures second/third entries go through the full financial workflow again

      if (currentStatus === 'PHYSICAL_INSPECTION') {
        // Transition to INVENTORY_ENTRY (first or additional inventory while still at physical inspection)
        try {
          await WorkflowEngine.transitionTo(
            inventoryData.sampleEntryId,
            'INVENTORY_ENTRY',
            userId,
            userRole,
            { inventoryDataId: inventory.id }
          );
          console.log('SUCCESS: Transitioned to INVENTORY_ENTRY');
        } catch (err) {
          console.log('Transition error:', err.message);
        }
      } else if (currentStatus === 'INVENTORY_ENTRY' && !existingForThisLorry) {
        // Adding another lorry while still at INVENTORY_ENTRY - no workflow transition needed
        // The owner will submit financial calculations for all lorries together
        console.log('New lorry added at INVENTORY_ENTRY stage - no workflow transition needed');
      } else if (['OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW'].includes(currentStatus) && !existingForThisLorry) {
        // New lorry/entry added after financial stages have already progressed
        // Reset workflow back to OWNER_FINANCIAL so financial calculations happen again
        try {
          await WorkflowEngine.transitionTo(
            inventoryData.sampleEntryId,
            'OWNER_FINANCIAL',
            userId,
            userRole,
            { inventoryDataId: inventory.id, newLorryAdded: true, previousStatus: currentStatus }
          );
          console.log(`SUCCESS: Transitioned from ${currentStatus} to OWNER_FINANCIAL (new lorry added)`);
        } catch (err) {
          console.log('Transition error:', err.message);
        }
      } else {
        console.log('SKIPPING transition - status is', currentStatus, ', existing for this lorry:', !!existingForThisLorry);
      }

      return inventory;

    } catch (error) {
      console.error('Error creating inventory data:', error);
      throw error;
    }
  }

  async getInventoryDataByPhysicalInspection(physicalInspectionId, options = {}) {
    return await InventoryDataRepository.findByPhysicalInspectionId(physicalInspectionId, options);
  }

  async updateInventoryData(id, updates, userId) {
    try {
      const current = await InventoryDataRepository.findById(id);
      if (!current) {
        throw new Error('Inventory data not found');
      }

      if (updates.grossWeight || updates.tareWeight) {
        const grossWeight = updates.grossWeight || current.grossWeight;
        const tareWeight = updates.tareWeight || current.tareWeight;

        const validation = ValidationService.validateWeights(grossWeight, tareWeight);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }

      const updated = await InventoryDataRepository.update(id, updates);
      await AuditService.logUpdate(userId, 'inventory_data', id, current, updated);
      return updated;

    } catch (error) {
      console.error('Error updating inventory data:', error);
      throw error;
    }
  }
}

module.exports = new InventoryDataService();
