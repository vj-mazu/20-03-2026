const SampleEntryAuditLog = require('../models/SampleEntryAuditLog');

class AuditLogRepository {
  /**
   * Create audit log entry
   * @param {Object} logData - Audit log data
   * @returns {Promise<Object>} Created audit log
   */
  async create(logData) {
    const log = await SampleEntryAuditLog.create(logData);
    return log.toJSON();
  }

  /**
   * Find audit logs by filters
   * @param {Object} filters - Filter options
   * @param {number} filters.userId - Filter by user ID
   * @param {string} filters.tableName - Filter by table name
   * @param {number} filters.recordId - Filter by record ID
   * @param {string} filters.actionType - Filter by action type
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {number} filters.limit - Limit results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Object>} Object with logs and total count
   */
  async findByFilters(filters = {}) {
    const where = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.tableName) where.tableName = filters.tableName;
    if (filters.recordId) where.recordId = filters.recordId;
    if (filters.actionType) where.actionType = filters.actionType;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.$gte = filters.startDate;
      if (filters.endDate) where.createdAt.$lte = filters.endDate;
    }

    const queryOptions = {
      where,
      limit: filters.limit || 100,
      offset: filters.offset || 0,
      order: [['createdAt', 'DESC']]
    };

    const { count, rows } = await SampleEntryAuditLog.findAndCountAll(queryOptions);

    return {
      logs: rows.map(log => log.toJSON()),
      total: count
    };
  }

  /**
   * Find audit logs for a specific record
   * @param {string} tableName - Table name
   * @param {number} recordId - Record ID
   * @returns {Promise<Array>} Array of audit logs
   */
  async findByRecord(tableName, recordId) {
    const logs = await SampleEntryAuditLog.findAll({
      where: { tableName, recordId },
      order: [['createdAt', 'ASC']]
    });
    return logs.map(log => log.toJSON());
  }

  /**
   * Find audit logs by user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Limit results
   * @returns {Promise<Array>} Array of audit logs
   */
  async findByUser(userId, options = {}) {
    const logs = await SampleEntryAuditLog.findAll({
      where: { userId },
      limit: options.limit || 100,
      order: [['createdAt', 'DESC']]
    });
    return logs.map(log => log.toJSON());
  }

  // NOTE: No update or delete methods - audit logs are immutable
}

module.exports = new AuditLogRepository();
