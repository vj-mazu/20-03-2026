const { sequelize } = require('../config/database');

module.exports = {
    up: async () => {
        const transaction = await sequelize.transaction();

        try {
            console.log('🚀 Migration 44: Disabling Automatic Rice Hamali System...');

            // 1. Drop the trigger on rice_productions that auto-creates hamali entries
            console.log('📋 Step 1: Dropping rice production hamali trigger...');

            await sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_auto_create_rice_production_hamali ON rice_productions;
      `, { transaction });

            // 2. Drop the trigger on rice_stock_movements (already disabled but cleanup)
            console.log('📋 Step 2: Dropping rice stock movement hamali trigger...');

            await sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_auto_create_rice_hamali ON rice_stock_movements;
      `, { transaction });

            // 3. Drop the functions (no longer needed)
            console.log('📋 Step 3: Dropping associated functions...');

            await sequelize.query(`
        DROP FUNCTION IF EXISTS create_rice_production_hamali_entry();
        DROP FUNCTION IF EXISTS create_automatic_rice_hamali_entry();
      `, { transaction });

            // 4. Delete all existing auto-created hamali entries (entries created by the trigger)
            console.log('📋 Step 4: Deleting existing auto-created rice hamali entries...');

            const [deleteResult] = await sequelize.query(`
        DELETE FROM rice_hamali_entries 
        WHERE remarks ILIKE '%Auto-created%' 
           OR remarks ILIKE '%Migration auto-created%'
        RETURNING id;
      `, { transaction });

            const deletedCount = deleteResult?.length || 0;
            console.log(`   Deleted ${deletedCount} auto-created hamali entries`);

            await transaction.commit();

            console.log('✅ Migration 44 completed successfully!');
            console.log('📊 Results:');
            console.log('   - Dropped trigger: trigger_auto_create_rice_production_hamali');
            console.log('   - Dropped trigger: trigger_auto_create_rice_hamali');
            console.log('   - Dropped function: create_rice_production_hamali_entry');
            console.log('   - Dropped function: create_automatic_rice_hamali_entry');
            console.log(`   - Deleted ${deletedCount} auto-created hamali entries`);
            console.log('🎉 Automatic hamali entries will NO LONGER be created!');
            console.log('   Users must manually add hamali entries if needed.');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Migration 44 failed:', error);
            throw error;
        }
    },

    down: async () => {
        // The down migration intentionally does nothing
        // If you need to re-enable auto-hamali, run migration 43 again
        console.log('⚠️ Migration 44 down: Nothing to do - auto-hamali remains disabled');
        console.log('   To re-enable auto-hamali, manually run migration 43 again');
    }
};
