const LotAllotment = require('../models/LotAllotment');
const PhysicalInspection = require('../models/PhysicalInspection');

class LotAllotmentRepository {
  /**
   * Create lot allotment
   * @param {Object} allotmentData - Lot allotment data
   * @returns {Promise<Object>} Created lot allotment
   * @throws {Error} If sample entry already has an allotment
   */
  async create(allotmentData) {
    // Check for duplicate allotment
    const existing = await LotAllotment.findOne({
      where: { sampleEntryId: allotmentData.sampleEntryId }
    });

    if (existing) {
      throw new Error('Sample entry already has a lot allotment');
    }

    const allotment = await LotAllotment.create(allotmentData);
    return allotment.toJSON();
  }

  /**
   * Find lot allotment by ID
   * @param {number} id - Lot allotment ID
   * @param {Object} options - Query options
   * @param {boolean} options.includeInspection - Include physical inspection
   * @returns {Promise<Object|null>} Lot allotment or null
   */
  async findById(id, options = {}) {
    const include = [];

    if (options.includeInspection) {
      include.push({ model: PhysicalInspection, as: 'physicalInspections' });
    }

    const allotment = await LotAllotment.findByPk(id, { include });
    return allotment ? allotment.toJSON() : null;
  }

  /**
   * Find lot allotments by physical supervisor ID
   * @param {number} physicalSupervisorId - Physical supervisor user ID
   * @param {Object} options - Query options
   * @param {boolean} options.pendingOnly - Only return allotments without inspection
   * @returns {Promise<Array>} Array of lot allotments
   */
  async findByPhysicalSupervisorId(physicalSupervisorId, options = {}) {
    const where = { allottedToSupervisorId: physicalSupervisorId };

    const queryOptions = {
      where,
      include: [{ model: PhysicalInspection, as: 'physicalInspections' }],
      order: [['createdAt', 'DESC']]
    };

    const allotments = await LotAllotment.findAll(queryOptions);

    let results = allotments.map(allotment => allotment.toJSON());

    // Filter for pending only if requested
    if (options.pendingOnly) {
      results = results.filter(allotment => !allotment.physicalInspections?.length);
    }

    return results;
  }

  /**
   * Find lot allotment by sample entry ID
   * @param {number} sampleEntryId - Sample entry ID
   * @returns {Promise<Object|null>} Lot allotment or null
   */
  async findBySampleEntryId(sampleEntryId) {
    const allotment = await LotAllotment.findOne({
      where: { sampleEntryId }
    });
    return allotment ? allotment.toJSON() : null;
  }

  /**
   * Update lot allotment
   * @param {number} id - Lot allotment ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated lot allotment or null
   */
  async update(id, updates) {
    const allotment = await LotAllotment.findByPk(id);
    if (!allotment) return null;

    await allotment.update(updates);
    return allotment.toJSON();
  }

  /**
   * Check if sample entry has allotment
   * @param {number} sampleEntryId - Sample entry ID
   * @returns {Promise<boolean>} True if allotment exists
   */
  async hasAllotment(sampleEntryId) {
    const count = await LotAllotment.count({
      where: { sampleEntryId }
    });
    return count > 0;
  }
}

module.exports = new LotAllotmentRepository();
