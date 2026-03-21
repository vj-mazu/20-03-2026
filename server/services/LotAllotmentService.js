const LotAllotmentRepository = require('../repositories/LotAllotmentRepository');
const AuditService = require('./AuditService');
const WorkflowEngine = require('./WorkflowEngine');

class LotAllotmentService {
  /**
   * Create lot allotment
   * @param {Object} allotmentData - Lot allotment data
   * @param {number} userId - User ID creating the allotment (manager)
   * @param {string} userRole - User role
   * @returns {Promise<Object>} Created lot allotment
   */
  async createLotAllotment(allotmentData, userId, userRole) {
    try {
      // Validate required fields
      if (!allotmentData.sampleEntryId || !allotmentData.physicalSupervisorId) {
        throw new Error('Sample entry ID and physical supervisor ID are required');
      }

      // Get the sample entry to know total bags (for default allottedBags)
      const SampleEntryRepository = require('../repositories/SampleEntryRepository');
      const entry = await SampleEntryRepository.findById(allotmentData.sampleEntryId);

      console.log('🔍 DEBUG LotAllotmentService - entry:', JSON.stringify(entry));
      console.log('🔍 DEBUG LotAllotmentService - entry.bags:', entry?.bags);

      // Use provided allottedBags or default to total bags from entry
      // If allottedBags is provided and valid, use it; otherwise use entry.bags
      let allottedBags = null;
      if (allotmentData.allottedBags && allotmentData.allottedBags > 0) {
        allottedBags = allotmentData.allottedBags;
      } else if (entry?.bags && entry.bags > 0) {
        allottedBags = entry.bags;
      }
      console.log('🔍 DEBUG LotAllotmentService - allottedBags:', allottedBags);

      // Map to correct field names for the model
      const lotData = {
        sampleEntryId: allotmentData.sampleEntryId,
        allottedByManagerId: userId,
        allottedToSupervisorId: allotmentData.physicalSupervisorId,
        allottedBags: allottedBags
      };

      // Create lot allotment
      const allotment = await LotAllotmentRepository.create(lotData);

      // Log audit trail
      await AuditService.logCreate(userId, 'lot_allotments', allotment.id, allotment);

      // Transition workflow to PHYSICAL_INSPECTION (entry is already at LOT_ALLOTMENT)
      await WorkflowEngine.transitionTo(
        allotmentData.sampleEntryId,
        'PHYSICAL_INSPECTION',
        userId,
        userRole,
        { lotAllotmentId: allotment.id }
      );

      return allotment;

    } catch (error) {
      console.error('Error creating lot allotment:', error);
      throw error;
    }
  }

  /**
   * Get lot allotment by ID
   * @param {number} id - Lot allotment ID
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Lot allotment or null
   */
  async getLotAllotmentById(id, options = {}) {
    return await LotAllotmentRepository.findById(id, options);
  }

  /**
   * Get lot allotments by physical supervisor
   * @param {number} physicalSupervisorId - Physical supervisor user ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of lot allotments
   */
  async getLotAllotmentsBySupervisor(physicalSupervisorId, options = {}) {
    return await LotAllotmentRepository.findByPhysicalSupervisorId(physicalSupervisorId, options);
  }

  /**
   * Get lot allotment by sample entry ID
   * @param {number} sampleEntryId - Sample entry ID
   * @returns {Promise<Object|null>} Lot allotment or null
   */
  async getLotAllotmentBySampleEntry(sampleEntryId) {
    return await LotAllotmentRepository.findBySampleEntryId(sampleEntryId);
  }

  /**
   * Update lot allotment
   * @param {number} id - Lot allotment ID
   * @param {Object} updates - Fields to update
   * @param {number} userId - User ID performing the update
   * @returns {Promise<Object|null>} Updated lot allotment or null
   */
  async updateLotAllotment(id, updates, userId) {
    try {
      const current = await LotAllotmentRepository.findById(id);
      if (!current) {
        throw new Error('Lot allotment not found');
      }

      const updated = await LotAllotmentRepository.update(id, updates);

      await AuditService.logUpdate(userId, 'lot_allotments', id, current, updated);

      return updated;

    } catch (error) {
      console.error('Error updating lot allotment:', error);
      throw error;
    }
  }
}

module.exports = new LotAllotmentService();
