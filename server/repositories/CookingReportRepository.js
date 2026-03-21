const CookingReport = require('../models/CookingReport');

class CookingReportRepository {
  /**
   * Create cooking report for a sample entry
   * @param {Object} reportData - Cooking report data
   * @returns {Promise<Object>} Created cooking report
   */
  async create(reportData) {
    const report = await CookingReport.create(reportData);
    return report.toJSON();
  }

  /**
   * Find cooking report by sample entry ID
   * @param {number} sampleEntryId - Sample entry ID
   * @returns {Promise<Object|null>} Cooking report or null
   */
  async findBySampleEntryId(sampleEntryId) {
    const report = await CookingReport.findOne({
      where: { sampleEntryId }
    });
    return report ? report.toJSON() : null;
  }

  /**
   * Update cooking report
   * @param {number} id - Cooking report ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated cooking report or null
   */
  async update(id, updates) {
    const report = await CookingReport.findByPk(id);
    if (!report) return null;
    
    await report.update(updates);
    return report.toJSON();
  }

  /**
   * Update cooking report by sample entry ID
   * @param {number} sampleEntryId - Sample entry ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object|null>} Updated cooking report or null
   */
  async updateBySampleEntryId(sampleEntryId, updates) {
    const report = await CookingReport.findOne({
      where: { sampleEntryId }
    });
    if (!report) return null;
    
    await report.update(updates);
    return report.toJSON();
  }

  /**
   * Find all cooking reports with specific status
   * @param {string} status - Cooking report status (PASS, FAIL, RECHECK, MEDIUM)
   * @returns {Promise<Array>} Array of cooking reports
   */
  async findByStatus(status) {
    const reports = await CookingReport.findAll({
      where: { status }
    });
    return reports.map(report => report.toJSON());
  }
}

module.exports = new CookingReportRepository();
