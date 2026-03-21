/**
 * Migration 58: Backfill source_bags for existing Palti movements
 * 
 * This migration updates existing Palti records where source_bags is NULL
 * by calculating it from quantity_quintals and source packaging weight.
 */

module.exports = {
    up: async (queryInterface) => {
        console.log('🔄 Backfilling source_bags for existing Palti movements...');

        try {
            // First, check if there are records that need updating
            const [needsUpdate] = await queryInterface.sequelize.query(`
                SELECT COUNT(*) as count 
                FROM rice_stock_movements 
                WHERE movement_type = 'palti' 
                  AND source_bags IS NULL 
                  AND source_packaging_id IS NOT NULL
            `);

            const count = parseInt(needsUpdate[0]?.count || 0);
            console.log(`📊 Found ${count} Palti records with NULL source_bags`);

            if (count > 0) {
                // Update source_bags by calculating from quintals and source packaging kg
                const [result] = await queryInterface.sequelize.query(`
                    UPDATE rice_stock_movements rsm
                    SET source_bags = ROUND((rsm.quantity_quintals * 100) / p."allottedKg")
                    FROM packagings p
                    WHERE rsm.source_packaging_id = p.id
                      AND rsm.movement_type = 'palti'
                      AND rsm.source_bags IS NULL
                    RETURNING rsm.id
                `);

                console.log(`✅ Updated ${result?.length || 0} Palti records with calculated source_bags`);
            } else {
                console.log('ℹ️ No records need backfilling');
            }

            return Promise.resolve();
        } catch (error) {
            console.error('❌ Error backfilling source_bags:', error);
            return Promise.reject(error);
        }
    },

    down: async (queryInterface) => {
        console.log('🔄 Reverting source_bags backfill (setting to NULL)...');

        try {
            // This is a soft revert - just log that we can't safely undo calculated values
            console.log('⚠️ Cannot distinguish between originally calculated and manually entered source_bags');
            console.log('⚠️ No changes made during rollback');
            return Promise.resolve();
        } catch (error) {
            console.error('❌ Error in rollback:', error);
            return Promise.reject(error);
        }
    }
};
