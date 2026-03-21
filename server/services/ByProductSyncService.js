const RiceProduction = require('../models/RiceProduction');
const ByProduct = require('../models/ByProduct');
const Outturn = require('../models/Outturn');
const { sequelize } = require('../config/database');
const YieldCalculationService = require('./YieldCalculationService');

class ByProductSyncService {
    /**
     * Resyncs all by-products for a specific outturn.
     * This is the safest way to ensure the By-Products table matches 102% of Rice Productions.
     * 
     * @param {number} outturnId The outturn ID to sync
     * @param {number} userId The user ID (used for 'createdBy' if new rows are made)
     */
    static async syncOutturn(outturnId, userId) {
        if (!outturnId) return;

        const transaction = await sequelize.transaction();

        try {
            console.log(`🔄 [BY-PRODUCT SYNC] Starting full resync for Outturn ID: ${outturnId}...`);

            // 1. Fetch all rice production records for this outturn
            const productions = await RiceProduction.findAll({
                where: { outturnId },
                transaction
            });

            console.log(`   - Found ${productions.length} production entries to aggregate.`);

            // 2. Aggregate quantity by Date and Product Type
            // We use a map to group by date: { '2025-02-03': { rice: 10, bran: 5... } }
            const aggregatesByDate = {};

            productions.forEach(prod => {
                const dateStr = this.normalizeDate(prod.date);
                if (!dateStr) return;

                if (!aggregatesByDate[dateStr]) {
                    aggregatesByDate[dateStr] = {
                        rice: 0, rejectionRice: 0, rjRice1: 0, rjRice2: 0,
                        broken: 0, rejectionBroken: 0, zeroBroken: 0,
                        faram: 0, bran: 0, unpolished: 0
                    };
                }

                const field = this.getFieldFromProductType(prod.productType);
                const qty = parseFloat(prod.quantityQuintals) || 0;

                aggregatesByDate[dateStr][field] += qty;
            });

            // 3. Delete ALL existing by-products for this outturn
            // This wipes the slate clean to prevent "orphans" (like the user's Jan 3rd issue)
            const deletedCount = await ByProduct.destroy({
                where: { outturnId },
                transaction
            });

            console.log(`   - Wiped ${deletedCount} old By-Product rows.`);

            // 4. Create fresh entries from aggregates
            const dates = Object.keys(aggregatesByDate);
            for (const date of dates) {
                const data = aggregatesByDate[date];

                // Skip entry if everything is 0 (to keep table clean)
                const total = Object.values(data).reduce((s, v) => s + v, 0);
                if (total === 0) continue;

                await ByProduct.create({
                    outturnId,
                    date,
                    ...data,
                    createdBy: userId
                }, { transaction });
            }

            console.log(`   - Created ${dates.length} fresh By-Product rows.`);

            // 5. Commit the transaction
            await transaction.commit();
            console.log(`✅ [BY-PRODUCT SYNC] Outturn ${outturnId} resynced successfully.`);

            // 6. Trigger Yield Calculation (Post-Sync)
            try {
                await YieldCalculationService.calculateAndUpdateYield(outturnId);
            } catch (yError) {
                console.error(`⚠️ Yield calculation failed after sync for outturn ${outturnId}:`, yError.message);
            }

        } catch (error) {
            await transaction.rollback();
            console.error(`❌ [BY-PRODUCT SYNC] FAILED for Outturn ${outturnId}:`, error);
            throw error;
        }
    }

    /**
     * Safe Date Normalizer
     * Returns YYYY-MM-DD string without timezone shifts
     */
    static normalizeDate(d) {
        if (!d) return null;
        if (typeof d === 'string') return d.substring(0, 10);
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return null;

        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Field Mapper
     * Maps product types to by-product column names
     * 
     * IMPORTANT MAPPINGS:
     * - "Rejection Rice" → rejectionRice column
     * - "RJ Broken" and "Rejection Broken" → rejectionBroken column (SAME product)
     */
    static getFieldFromProductType(typeStr) {
        if (!typeStr) return 'rice';
        const typeLower = typeStr.toLowerCase();
        
        // Rice types
        if (typeLower === 'rj rice 1') return 'rjRice1';
        if (typeLower === 'rj rice 2') return 'rjRice2';
        if (typeLower === 'rejection rice') return 'rejectionRice';
        if (typeLower === 'sizer broken') return 'rejectionRice';
        if (typeLower.includes('rice')) return 'rice';
        
        // Broken types
        // IMPORTANT: "RJ Broken" and "Rejection Broken" are the SAME product
        if (typeLower === 'rj broken') return 'rejectionBroken';
        if (typeLower === 'rejection broken') return 'rejectionBroken';
        if (typeLower.includes('zero') && typeLower.includes('broken')) return 'zeroBroken';
        if (typeLower === '0 broken') return 'zeroBroken';
        if (typeLower.includes('broken')) return 'broken';
        
        // Other types
        if (typeLower.includes('faram')) return 'faram';
        if (typeLower.includes('bran')) return 'bran';
        if (typeLower.includes('unpolish')) return 'unpolished';
        
        return 'rice';
    }
}

module.exports = ByProductSyncService;
