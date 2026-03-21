const { sequelize } = require('../config/database');

/**
 * Hamali Integration Service - Handles hamali entries for palti operations
 * Integrates palti work with the hamali system for labor tracking
 */
class HamaliIntegrationService {

    /**
     * Create hamali entry for palti operation
     * @param {Object} paltiData - Palti operation data
     * @returns {Promise<Object>} Created hamali entry
     */
    async createPaltiHamaliEntry(paltiData) {
        try {
            const {
                riceStockMovementId,
                sourceBags,
                targetBags,
                sourcePackagingBrand,
                targetPackagingBrand,
                sourcePackagingKg,
                targetPackagingKg,
                variety,
                locationCode,
                workerName = 'System',
                shortageKg = 0,
                shortageBags = 0,
                shortageReason = 'No shortage'
            } = paltiData;

            // Get appropriate hamali rate for palti work
            const hamaliRate = await this.getPaltiHamaliRate(sourcePackagingKg, targetPackagingKg);
            
            // Calculate hamali amount based on source bags (work done on source bags)
            const hamaliAmount = sourceBags * hamaliRate.rate;

            // Create detailed remarks for palti hamali entry
            const remarks = this.generatePaltiHamaliRemarks({
                sourceBags,
                targetBags,
                sourcePackagingBrand,
                targetPackagingBrand,
                sourcePackagingKg,
                targetPackagingKg,
                variety,
                locationCode,
                workerName,
                shortageKg,
                shortageReason
            });

            // Insert hamali entry
            const result = await sequelize.query(`
                INSERT INTO rice_hamali_entries (
                    rice_stock_movement_id,
                    rice_hamali_rate_id,
                    bags,
                    remarks,
                    entry_type,
                    created_at,
                    updated_at
                ) VALUES (
                    :riceStockMovementId,
                    :hamaliRateId,
                    :bags,
                    :remarks,
                    'palti_auto',
                    NOW(),
                    NOW()
                ) RETURNING id
            `, {
                replacements: {
                    riceStockMovementId,
                    hamaliRateId: hamaliRate.id,
                    bags: sourceBags, // Hamali is calculated on source bags (work done)
                    remarks
                },
                type: sequelize.QueryTypes.INSERT
            });

            const hamaliEntryId = result[0][0]?.id || result[0]?.id;

            console.log('✅ Palti hamali entry created:', {
                hamaliEntryId,
                riceStockMovementId,
                sourceBags,
                hamaliRate: hamaliRate.rate,
                hamaliAmount,
                remarks: remarks.substring(0, 100) + '...'
            });

            return {
                id: hamaliEntryId,
                riceStockMovementId,
                hamaliRateId: hamaliRate.id,
                bags: sourceBags,
                rate: hamaliRate.rate,
                amount: hamaliAmount,
                remarks,
                workType: hamaliRate.work_type,
                workDetail: hamaliRate.work_detail
            };

        } catch (error) {
            console.error('Error creating palti hamali entry:', error);
            throw error;
        }
    }

    /**
     * Get appropriate hamali rate for palti operations
     * @param {number} sourcePackagingKg - Source packaging weight
     * @param {number} targetPackagingKg - Target packaging weight
     * @returns {Promise<Object>} Hamali rate information
     */
    async getPaltiHamaliRate(sourcePackagingKg, targetPackagingKg) {
        try {
            // Determine work type based on packaging sizes
            let workType = 'Palti Work';
            let workDetail = 'General Palti';

            // Specific work types based on common packaging conversions
            if (sourcePackagingKg >= 50 && targetPackagingKg <= 30) {
                workType = 'Palti Heavy to Light';
                workDetail = 'Converting heavy bags to lighter packaging';
            } else if (sourcePackagingKg <= 30 && targetPackagingKg >= 50) {
                workType = 'Palti Light to Heavy';
                workDetail = 'Converting light bags to heavier packaging';
            } else if (Math.abs(sourcePackagingKg - targetPackagingKg) <= 5) {
                workType = 'Palti Same Size';
                workDetail = 'Converting between similar packaging sizes';
            }

            // Try to find existing palti rate
            let rateResult = await sequelize.query(`
                SELECT id, work_type, work_detail, rate_21_24, is_active
                FROM rice_hamali_rates 
                WHERE work_type ILIKE '%palti%' 
                  AND is_active = true
                ORDER BY id DESC
                LIMIT 1
            `, {
                type: sequelize.QueryTypes.SELECT
            });

            // If no specific palti rate found, create one or use general rate
            if (rateResult.length === 0) {
                // Try to find a general rice work rate
                rateResult = await sequelize.query(`
                    SELECT id, work_type, work_detail, rate_21_24, is_active
                    FROM rice_hamali_rates 
                    WHERE work_type ILIKE '%rice%' 
                      AND is_active = true
                    ORDER BY rate_21_24 ASC
                    LIMIT 1
                `, {
                    type: sequelize.QueryTypes.SELECT
                });

                // If still no rate found, create a default palti rate
                if (rateResult.length === 0) {
                    const defaultRate = await this.createDefaultPaltiRate();
                    return defaultRate;
                }
            }

            const rate = rateResult[0];
            return {
                id: rate.id,
                work_type: workType,
                work_detail: workDetail,
                rate: parseFloat(rate.rate_21_24 || 2.0), // Default rate if not found
                is_active: rate.is_active
            };

        } catch (error) {
            console.error('Error getting palti hamali rate:', error);
            // Return default rate on error
            return {
                id: null,
                work_type: 'Palti Work',
                work_detail: 'General Palti Work',
                rate: 2.0,
                is_active: true
            };
        }
    }

    /**
     * Create default palti hamali rate if none exists
     * @returns {Promise<Object>} Created hamali rate
     */
    async createDefaultPaltiRate() {
        try {
            const result = await sequelize.query(`
                INSERT INTO rice_hamali_rates (
                    work_type,
                    work_detail,
                    rate_21_24,
                    is_active,
                    created_at,
                    updated_at
                ) VALUES (
                    'Palti Work',
                    'Rice packaging conversion work',
                    2.0,
                    true,
                    NOW(),
                    NOW()
                ) RETURNING id, work_type, work_detail, rate_21_24, is_active
            `, {
                type: sequelize.QueryTypes.INSERT
            });

            const newRate = result[0][0] || result[0];
            console.log('✅ Created default palti hamali rate:', newRate);

            return {
                id: newRate.id,
                work_type: newRate.work_type,
                work_detail: newRate.work_detail,
                rate: parseFloat(newRate.rate_21_24),
                is_active: newRate.is_active
            };

        } catch (error) {
            console.error('Error creating default palti rate:', error);
            throw error;
        }
    }

    /**
     * Generate detailed remarks for palti hamali entry
     * @param {Object} paltiData - Palti operation data
     * @returns {string} Generated remarks
     */
    generatePaltiHamaliRemarks(paltiData) {
        const {
            sourceBags,
            targetBags,
            sourcePackagingBrand,
            targetPackagingBrand,
            sourcePackagingKg,
            targetPackagingKg,
            variety,
            locationCode,
            workerName,
            shortageKg,
            shortageReason
        } = paltiData;

        const remarks = [
            `Palti Operation: ${sourcePackagingBrand} (${sourcePackagingKg}kg) → ${targetPackagingBrand} (${targetPackagingKg}kg)`,
            `Variety: ${variety}`,
            `Location: ${locationCode}`,
            `Source: ${sourceBags} bags × ${sourcePackagingKg}kg = ${(sourceBags * sourcePackagingKg).toFixed(2)}kg`,
            `Target: ${targetBags} bags × ${targetPackagingKg}kg = ${(targetBags * targetPackagingKg).toFixed(2)}kg`,
            shortageKg > 0 ? `Shortage: ${shortageKg.toFixed(2)}kg - ${shortageReason}` : 'No shortage',
            `Worker: ${workerName}`,
            `Auto-created: ${new Date().toISOString()}`
        ].join(', ');

        return remarks;
    }

    /**
     * Update hamali entry for palti operation modifications
     * @param {number} hamaliEntryId - Hamali entry ID
     * @param {Object} updateData - Updated palti data
     * @returns {Promise<boolean>} Success status
     */
    async updatePaltiHamaliEntry(hamaliEntryId, updateData) {
        try {
            const {
                sourceBags,
                targetBags,
                sourcePackagingBrand,
                targetPackagingBrand,
                sourcePackagingKg,
                targetPackagingKg,
                variety,
                locationCode,
                workerName,
                shortageKg,
                shortageReason
            } = updateData;

            // Generate updated remarks
            const remarks = this.generatePaltiHamaliRemarks(updateData);

            // Update hamali entry
            await sequelize.query(`
                UPDATE rice_hamali_entries 
                SET 
                    bags = :bags,
                    remarks = :remarks,
                    updated_at = NOW()
                WHERE id = :hamaliEntryId
            `, {
                replacements: {
                    hamaliEntryId,
                    bags: sourceBags,
                    remarks
                }
            });

            console.log('✅ Palti hamali entry updated:', { hamaliEntryId, sourceBags });
            return true;

        } catch (error) {
            console.error('Error updating palti hamali entry:', error);
            return false;
        }
    }

    /**
     * Delete hamali entry for palti operation
     * @param {number} riceStockMovementId - Rice stock movement ID
     * @returns {Promise<boolean>} Success status
     */
    async deletePaltiHamaliEntry(riceStockMovementId) {
        try {
            await sequelize.query(`
                DELETE FROM rice_hamali_entries 
                WHERE rice_stock_movement_id = :riceStockMovementId 
                  AND entry_type = 'palti_auto'
            `, {
                replacements: { riceStockMovementId }
            });

            console.log('✅ Palti hamali entry deleted for movement:', riceStockMovementId);
            return true;

        } catch (error) {
            console.error('Error deleting palti hamali entry:', error);
            return false;
        }
    }

    /**
     * Get hamali entries for palti operations
     * @param {Object} filters - Filtering options
     * @returns {Promise<Array>} Hamali entries
     */
    async getPaltiHamaliEntries(filters = {}) {
        try {
            const { dateFrom, dateTo, locationCode, variety } = filters;
            
            let whereClause = "WHERE rhe.entry_type = 'palti_auto'";
            const replacements = {};

            if (dateFrom) {
                whereClause += ' AND rsm.date >= :dateFrom';
                replacements.dateFrom = dateFrom;
            }
            if (dateTo) {
                whereClause += ' AND rsm.date <= :dateTo';
                replacements.dateTo = dateTo;
            }
            if (locationCode) {
                whereClause += ' AND rsm.location_code = :locationCode';
                replacements.locationCode = locationCode;
            }
            if (variety) {
                whereClause += ' AND rsm.variety = :variety';
                replacements.variety = variety;
            }

            const result = await sequelize.query(`
                SELECT 
                    rhe.id,
                    rhe.rice_stock_movement_id,
                    rhe.bags,
                    rhe.remarks,
                    rhe.entry_type,
                    rhe.created_at,
                    rhr.work_type,
                    rhr.work_detail,
                    rhr.rate_21_24 as rate,
                    (rhe.bags * rhr.rate_21_24) as amount,
                    rsm.date,
                    rsm.variety,
                    rsm.location_code,
                    rsm.movement_type,
                    rsm.conversion_shortage_kg,
                    rsm.conversion_shortage_bags,
                    sp."brandName" as source_packaging_brand,
                    tp."brandName" as target_packaging_brand
                FROM rice_hamali_entries rhe
                LEFT JOIN rice_hamali_rates rhr ON rhe.rice_hamali_rate_id = rhr.id
                LEFT JOIN rice_stock_movements rsm ON rhe.rice_stock_movement_id = rsm.id
                LEFT JOIN packagings sp ON rsm.source_packaging_id = sp.id
                LEFT JOIN packagings tp ON rsm.target_packaging_id = tp.id
                ${whereClause}
                ORDER BY rsm.date DESC, rhe.created_at DESC
            `, {
                replacements,
                type: sequelize.QueryTypes.SELECT
            });

            return result.map(entry => ({
                id: entry.id,
                rice_stock_movement_id: entry.rice_stock_movement_id,
                bags: parseInt(entry.bags || 0),
                rate: parseFloat(entry.rate || 0),
                amount: parseFloat(entry.amount || 0),
                work_type: entry.work_type,
                work_detail: entry.work_detail,
                remarks: entry.remarks,
                date: entry.date,
                variety: entry.variety,
                location_code: entry.location_code,
                movement_type: entry.movement_type,
                conversion_shortage_kg: parseFloat(entry.conversion_shortage_kg || 0),
                conversion_shortage_bags: parseFloat(entry.conversion_shortage_bags || 0),
                source_packaging_brand: entry.source_packaging_brand,
                target_packaging_brand: entry.target_packaging_brand,
                created_at: entry.created_at
            }));

        } catch (error) {
            console.error('Error getting palti hamali entries:', error);
            throw error;
        }
    }

    /**
     * Get hamali summary for palti operations
     * @param {Object} filters - Filtering options
     * @returns {Promise<Object>} Hamali summary
     */
    async getPaltiHamaliSummary(filters = {}) {
        try {
            const entries = await this.getPaltiHamaliEntries(filters);
            
            const summary = {
                total_entries: entries.length,
                total_bags: entries.reduce((sum, entry) => sum + entry.bags, 0),
                total_amount: entries.reduce((sum, entry) => sum + entry.amount, 0),
                total_shortage_kg: entries.reduce((sum, entry) => sum + entry.conversion_shortage_kg, 0),
                total_shortage_bags: entries.reduce((sum, entry) => sum + entry.conversion_shortage_bags, 0),
                average_rate: entries.length > 0 ? 
                    entries.reduce((sum, entry) => sum + entry.rate, 0) / entries.length : 0,
                varieties: [...new Set(entries.map(entry => entry.variety))],
                locations: [...new Set(entries.map(entry => entry.location_code))],
                date_range: {
                    from: entries.length > 0 ? entries[entries.length - 1].date : null,
                    to: entries.length > 0 ? entries[0].date : null
                }
            };

            return summary;

        } catch (error) {
            console.error('Error getting palti hamali summary:', error);
            throw error;
        }
    }
}

module.exports = new HamaliIntegrationService();