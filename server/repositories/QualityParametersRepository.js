const QualityParameters = require('../models/QualityParameters');

class QualityParametersRepository {
  /**
   * Create quality parameters for a sample entry
   * @param {Object} qualityData - Quality parameters data
   * @returns {Promise<Object>} Created quality parameters
   */
  async create(qualityData) {
    const quality = await QualityParameters.create(qualityData);
    return quality.toJSON();
  }

  /**
   * Find quality parameters by sample entry ID
   * @param {number} sampleEntryId - Sample entry ID
   * @returns {Promise<Object|null>} Quality parameters or null
   */
  async findBySampleEntryId(sampleEntryId) {
    const quality = await QualityParameters.findOne({
      where: { sampleEntryId }
    });
    return quality ? quality.toJSON() : null;
  }

  /**
   * Update quality parameters
   * @param {number} id - Quality parameters ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated quality parameters or null
   */
  async update(id, updates) {
    const quality = await QualityParameters.findByPk(id);
    if (!quality) return null;
    
    await quality.update(updates);
    return quality.toJSON();
  }

  /**
   * Update quality parameters by sample entry ID
   * @param {number} sampleEntryId - Sample entry ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated quality parameters or null
   */
  async updateBySampleEntryId(sampleEntryId, updates) {
    const quality = await QualityParameters.findOne({
      where: { sampleEntryId }
    });
    if (!quality) return null;
    
    await quality.update(updates);
    return quality.toJSON();
  }
}

module.exports = new QualityParametersRepository();
