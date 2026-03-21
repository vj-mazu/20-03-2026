/**
 * Migration: Add critical performance indexes for outturn and purchase operations
 * 
 * This migration adds indexes to speed up:
 * - Clear outturn operations (arrivals.outturnId + movementType)
 * - Rice production queries (outturnId + status)
 * - Purchase operations
 */

const { sequelize } = require('../config/database');

async function up() {
    console.log('⚡ Adding performance indexes for outturn and purchase operations...');

    try {
        // Helper function to safely create index
        const createIndexSafely = async (tableName, indexName, columns, options = {}) => {
            try {
                const [existing] = await sequelize.query(`
                    SELECT indexname 
                    FROM pg_indexes 
                    WHERE tablename = '${tableName}' 
                    AND indexname = '${indexName}'
                `);

                if (existing.length === 0) {
                    const whereClause = options.where ? ` WHERE ${options.where}` : '';
                    await sequelize.query(`
                        CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName} 
                        ON ${tableName} (${columns.join(', ')})${whereClause}
                    `);
                    console.log(`  ✅ Created index: ${indexName}`);
                } else {
                    console.log(`  ⏩ Index already exists: ${indexName}`);
                }
            } catch (error) {
                console.log(`  ⚠️ Could not create ${indexName}:`, error.message);
            }
        };

        // 1. Arrivals table - for clear outturn queries
        console.log('\n📊 Optimizing arrivals table...');
        await createIndexSafely('arrivals', 'idx_arrivals_outturn_movement_bags', ['"outturnId"', '"movementType"', 'bags']);

        // 2. Rice productions table - for clear outturn queries
        console.log('\n📊 Optimizing rice_productions table...');
        await createIndexSafely('rice_productions', 'idx_rice_prod_outturn_status_deducted', ['"outturnId"', 'status', '"paddyBagsDeducted"']);

        // 3. Rice stock movements - for purchase operations
        console.log('\n📊 Optimizing rice_stock_movements table...');
        await createIndexSafely('rice_stock_movements', 'idx_rice_stock_movement_type_date', ['movement_type', 'date', 'status']);
        await createIndexSafely('rice_stock_movements', 'idx_rice_stock_created_status', ['created_at', 'status']);

        // 4. Outturns table - for general outturn queries
        console.log('\n📊 Optimizing outturns table...');
        await createIndexSafely('outturns', 'idx_outturns_cleared_created', ['is_cleared', '"createdAt"']);

        console.log('\n✅ Performance indexes created successfully!');

    } catch (error) {
        console.error('❌ Migration error:', error);
        throw error;
    }
}

async function down() {
    console.log('🔧 Removing performance indexes...');

    try {
        await sequelize.query('DROP INDEX IF EXISTS idx_arrivals_outturn_movement_bags');
        await sequelize.query('DROP INDEX IF EXISTS idx_rice_prod_outturn_status_deducted');
        await sequelize.query('DROP INDEX IF EXISTS idx_rice_stock_movement_type_date');
        await sequelize.query('DROP INDEX IF EXISTS idx_rice_stock_created_status');
        await sequelize.query('DROP INDEX IF EXISTS idx_outturns_cleared_created');

        console.log('✅ Performance indexes removed');
    } catch (error) {
        console.error('Rollback error:', error);
    }
}

module.exports = { up, down };
