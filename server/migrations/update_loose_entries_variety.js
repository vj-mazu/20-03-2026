const { sequelize } = require('../config/database');

/**
 * Migration: Update existing loose entries to have the correct variety
 * 
 * This fixes the bug where loose bags were not being counted in stock queries
 * because they were created without a variety field.
 */
async function updateLooseEntriesVariety() {
    try {
        console.log('🔄 Starting migration: Update loose entries variety...');

        // Update all loose entries that don't have a variety
        // Get the variety from the kunchinittu's allotted variety
        const result = await sequelize.query(`
      UPDATE arrivals a
      SET variety = (
        SELECT UPPER(TRIM(v.name))
        FROM kunchinittus k
        LEFT JOIN varieties v ON k."varietyId" = v.id
        WHERE k.id = a."toKunchinintuId"
      )
      WHERE a."movementType" = 'loose'
      AND (a.variety IS NULL OR a.variety = '')
    `);

        console.log('✅ Migration complete: Updated loose entries with variety from kunchinittu');
        return result;
    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
}

module.exports = updateLooseEntriesVariety;

// Allow running directly
if (require.main === module) {
    updateLooseEntriesVariety()
        .then(() => {
            console.log('Migration completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}
