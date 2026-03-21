const { sequelize } = require('../config/database');

/**
 * StatusManagementService - Manages entry save states across all hamali types
 * 
 * This service provides centralized status tracking for hamali entries,
 * allowing the system to track whether entries are saved, pending, in error, or being edited.
 * 
 * Supported entry types: 'paddy_hamali', 'rice_hamali', 'other_hamali'
 * Supported statuses: 'saved', 'pending', 'error', 'editing'
 */
class StatusManagementService {
    /**
     * Get status for a specific entry
     * @param {number} entryId - The ID of the entry
     * @param {string} entryType - Type of entry ('paddy_hamali', 'rice_hamali', 'other_hamali')
     * @returns {Promise<Object|null>} Status object or null if not found
     */
    static async getStatus(entryId, entryType) {
        try {
            const result = await sequelize.query(`
                SELECT 
                    id,
                    entry_id,
                    entry_type,
                    status,
                    last_modified,
                    last_updated,
                    modified_by,
                    metadata,
                    created_at,
                    updated_at
                FROM hamali_entry_status
                WHERE entry_id = :entryId AND entry_type = :entryType
                LIMIT 1
            `, {
                replacements: { entryId, entryType },
                type: sequelize.QueryTypes.SELECT
            });

            return result.length > 0 ? result[0] : null;
        } catch (error) {
            console.error('❌ Error getting status:', error);
            throw error;
        }
    }

    /**
     * Update or create status for an entry
     * @param {number} entryId - The ID of the entry
     * @param {string} entryType - Type of entry
     * @param {string} status - New status ('saved', 'pending', 'error', 'editing')
     * @param {number|null} modifiedBy - User ID who modified the status
     * @param {Object|null} metadata - Additional metadata
     * @returns {Promise<Object>} Updated status object
     */
    static async updateStatus(entryId, entryType, status, modifiedBy = null, metadata = null) {
        try {
            // Validate status
            const validStatuses = ['saved', 'pending', 'error', 'editing'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
            }

            // Validate entry type
            const validTypes = ['paddy_hamali', 'rice_hamali', 'other_hamali'];
            if (!validTypes.includes(entryType)) {
                throw new Error(`Invalid entry type: ${entryType}. Must be one of: ${validTypes.join(', ')}`);
            }

            const now = new Date().toISOString();

            // Use INSERT ... ON CONFLICT to handle both insert and update
            const result = await sequelize.query(`
                INSERT INTO hamali_entry_status (
                    entry_id, 
                    entry_type, 
                    status, 
                    last_modified, 
                    last_updated,
                    modified_by, 
                    metadata,
                    created_at,
                    updated_at
                )
                VALUES (
                    :entryId, 
                    :entryType, 
                    :status, 
                    :now, 
                    :now,
                    :modifiedBy, 
                    :metadata,
                    :now,
                    :now
                )
                ON CONFLICT (entry_id, entry_type) 
                DO UPDATE SET
                    status = :status,
                    last_modified = :now,
                    last_updated = :now,
                    modified_by = :modifiedBy,
                    metadata = :metadata,
                    updated_at = :now
                RETURNING *
            `, {
                replacements: {
                    entryId,
                    entryType,
                    status,
                    now,
                    modifiedBy,
                    metadata: metadata ? JSON.stringify(metadata) : null
                },
                type: sequelize.QueryTypes.INSERT
            });

            return result[0][0];
        } catch (error) {
            console.error('❌ Error updating status:', error);
            throw error;
        }
    }

    /**
     * Get statuses for multiple entries
     * @param {Array<{entryId: number, entryType: string}>} entries - Array of entry identifiers
     * @returns {Promise<Array>} Array of status objects
     */
    static async getBatchStatuses(entries) {
        try {
            if (!entries || entries.length === 0) {
                return [];
            }

            // Build WHERE clause for multiple entries
            const conditions = entries.map((_, index) => 
                `(entry_id = :entryId${index} AND entry_type = :entryType${index})`
            ).join(' OR ');

            const replacements = {};
            entries.forEach((entry, index) => {
                replacements[`entryId${index}`] = entry.entryId;
                replacements[`entryType${index}`] = entry.entryType;
            });

            const result = await sequelize.query(`
                SELECT 
                    id,
                    entry_id,
                    entry_type,
                    status,
                    last_modified,
                    last_updated,
                    modified_by,
                    metadata,
                    created_at,
                    updated_at
                FROM hamali_entry_status
                WHERE ${conditions}
            `, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return result;
        } catch (error) {
            console.error('❌ Error getting batch statuses:', error);
            throw error;
        }
    }

    /**
     * Update statuses for multiple entries
     * @param {Array<{entryId: number, entryType: string, status: string}>} updates - Array of status updates
     * @param {number|null} modifiedBy - User ID who modified the statuses
     * @returns {Promise<Array>} Array of updated status objects
     */
    static async updateBatchStatuses(updates, modifiedBy = null) {
        const transaction = await sequelize.transaction();
        
        try {
            const results = [];
            
            for (const update of updates) {
                const result = await this.updateStatus(
                    update.entryId,
                    update.entryType,
                    update.status,
                    modifiedBy,
                    update.metadata || null
                );
                results.push(result);
            }

            await transaction.commit();
            return results;
        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error updating batch statuses:', error);
            throw error;
        }
    }

    /**
     * Get all entries with a specific status
     * @param {string} status - Status to filter by
     * @param {string|null} entryType - Optional entry type filter
     * @returns {Promise<Array>} Array of status objects
     */
    static async getEntriesByStatus(status, entryType = null) {
        try {
            let query = `
                SELECT 
                    id,
                    entry_id,
                    entry_type,
                    status,
                    last_modified,
                    last_updated,
                    modified_by,
                    metadata,
                    created_at,
                    updated_at
                FROM hamali_entry_status
                WHERE status = :status
            `;

            const replacements = { status };

            if (entryType) {
                query += ' AND entry_type = :entryType';
                replacements.entryType = entryType;
            }

            query += ' ORDER BY last_updated DESC';

            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return result;
        } catch (error) {
            console.error('❌ Error getting entries by status:', error);
            throw error;
        }
    }

    /**
     * Delete status for an entry
     * @param {number} entryId - The ID of the entry
     * @param {string} entryType - Type of entry
     * @returns {Promise<boolean>} True if deleted, false if not found
     */
    static async deleteStatus(entryId, entryType) {
        try {
            const result = await sequelize.query(`
                DELETE FROM hamali_entry_status
                WHERE entry_id = :entryId AND entry_type = :entryType
                RETURNING id
            `, {
                replacements: { entryId, entryType },
                type: sequelize.QueryTypes.DELETE
            });

            return result[0].length > 0;
        } catch (error) {
            console.error('❌ Error deleting status:', error);
            throw error;
        }
    }

    /**
     * Get status summary statistics
     * @param {string|null} entryType - Optional entry type filter
     * @returns {Promise<Object>} Summary statistics
     */
    static async getStatusSummary(entryType = null) {
        try {
            let query = `
                SELECT 
                    entry_type,
                    status,
                    COUNT(*) as count
                FROM hamali_entry_status
            `;

            const replacements = {};

            if (entryType) {
                query += ' WHERE entry_type = :entryType';
                replacements.entryType = entryType;
            }

            query += ' GROUP BY entry_type, status ORDER BY entry_type, status';

            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            // Transform to nested object structure
            const summary = {};
            result.forEach(row => {
                if (!summary[row.entry_type]) {
                    summary[row.entry_type] = {};
                }
                summary[row.entry_type][row.status] = Number.parseInt(row.count);
            });

            return summary;
        } catch (error) {
            console.error('❌ Error getting status summary:', error);
            throw error;
        }
    }

    /**
     * Clean up old status entries (older than specified days)
     * @param {number} daysOld - Number of days to keep
     * @param {string} status - Optional status filter (e.g., only clean 'saved' entries)
     * @returns {Promise<number>} Number of deleted entries
     */
    static async cleanupOldStatuses(daysOld = 90, status = null) {
        try {
            let query = `
                DELETE FROM hamali_entry_status
                WHERE last_updated < NOW() - INTERVAL '${daysOld} days'
            `;

            const replacements = {};

            if (status) {
                query += ' AND status = :status';
                replacements.status = status;
            }

            query += ' RETURNING id';

            const result = await sequelize.query(query, {
                replacements,
                type: sequelize.QueryTypes.DELETE
            });

            return result[0].length;
        } catch (error) {
            console.error('❌ Error cleaning up old statuses:', error);
            throw error;
        }
    }
}

module.exports = StatusManagementService;