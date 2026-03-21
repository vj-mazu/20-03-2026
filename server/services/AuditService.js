const AuditLogRepository = require('../repositories/AuditLogRepository');

class AuditService {
  /**
   * Log an action to the audit trail
   * @param {Object} actionData - Action data
   * @param {number} actionData.userId - User ID performing the action
   * @param {string} actionData.tableName - Table name being modified
   * @param {number} actionData.recordId - Record ID being modified
   * @param {string} actionData.actionType - Action type (CREATE, UPDATE, DELETE, WORKFLOW_TRANSITION)
   * @param {Object} actionData.oldValues - Previous values (for UPDATE)
   * @param {Object} actionData.newValues - New values (for CREATE/UPDATE)
   * @returns {Promise<Object>} Created audit log
   */
  async logAction(actionData) {
    const { userId, tableName, recordId, actionType, oldValues, newValues } = actionData;

    const logEntry = {
      userId,
      tableName,
      recordId,
      actionType,
      oldValues: oldValues || null,
      newValues: newValues || null
    };

    return await AuditLogRepository.create(logEntry);
  }

  /**
   * Log a CREATE action
   * @param {number} userId - User ID
   * @param {string} tableName - Table name
   * @param {number} recordId - Record ID
   * @param {Object} newValues - New record values
   * @returns {Promise<Object>} Created audit log
   */
  async logCreate(userId, tableName, recordId, newValues) {
    return await this.logAction({
      userId,
      tableName,
      recordId,
      actionType: 'CREATE',
      oldValues: null,
      newValues
    });
  }

  /**
   * Log an UPDATE action
   * @param {number} userId - User ID
   * @param {string} tableName - Table name
   * @param {number} recordId - Record ID
   * @param {Object} oldValues - Previous values
   * @param {Object} newValues - New values
   * @returns {Promise<Object>} Created audit log
   */
  async logUpdate(userId, tableName, recordId, oldValues, newValues) {
    return await this.logAction({
      userId,
      tableName,
      recordId,
      actionType: 'UPDATE',
      oldValues,
      newValues
    });
  }

  /**
   * Log a DELETE action
   * @param {number} userId - User ID
   * @param {string} tableName - Table name
   * @param {number} recordId - Record ID
   * @param {Object} oldValues - Deleted record values
   * @returns {Promise<Object>} Created audit log
   */
  async logDelete(userId, tableName, recordId, oldValues) {
    return await this.logAction({
      userId,
      tableName,
      recordId,
      actionType: 'DELETE',
      oldValues,
      newValues: null
    });
  }

  /**
   * Log a workflow transition
   * @param {number} userId - User ID
   * @param {number} sampleEntryId - Sample entry ID
   * @param {string} fromStatus - Previous workflow status
   * @param {string} toStatus - New workflow status
   * @returns {Promise<Object>} Created audit log
   */
  async logWorkflowTransition(userId, sampleEntryId, fromStatus, toStatus) {
    return await this.logAction({
      userId,
      tableName: 'sample_entries',
      recordId: sampleEntryId,
      actionType: 'WORKFLOW_TRANSITION',
      oldValues: { workflowStatus: fromStatus },
      newValues: { workflowStatus: toStatus }
    });
  }

  /**
   * Get audit history for a record
   * @param {string} tableName - Table name
   * @param {number} recordId - Record ID
   * @returns {Promise<Array>} Array of audit logs
   */
  async getRecordHistory(tableName, recordId) {
    return await AuditLogRepository.findByRecord(tableName, recordId);
  }

  /**
   * Get audit logs by filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Object with logs and total count
   */
  async getAuditLogs(filters) {
    return await AuditLogRepository.findByFilters(filters);
  }

  /**
   * Get user activity
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of audit logs
   */
  async getUserActivity(userId, options = {}) {
    return await AuditLogRepository.findByUser(userId, options);
  }
}

module.exports = new AuditService();
