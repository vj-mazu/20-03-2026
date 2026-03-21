/**
 * Migration: Add rate and amount columns to rice_hamali_entries
 * 
 * Problem: When rates are edited in rice_hamali_rates table, past entries also show new rates
 * Solution: Store the actual rate and amount at time of entry (like paddy_hamali_entries)
 * 
 * This ensures historical data remains accurate even when rates are updated
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    console.log('🔧 Starting migration: Add rate and amount to rice_hamali_entries...');

    // Step 1: Add rate column (nullable initially for backfill)
    console.log('📋 Step 1: Adding rate column...');
    await queryInterface.addColumn(
      'rice_hamali_entries',
      'rate',
      {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: true, // Temporarily nullable for backfill
        comment: 'Rate per bag at time of entry (snapshot from rice_hamali_rates)'
      },
      { transaction }
    );

    // Step 2: Add amount column (nullable initially for backfill)
    console.log('📋 Step 2: Adding amount column...');
    await queryInterface.addColumn(
      'rice_hamali_entries',
      'amount',
      {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: true, // Temporarily nullable for backfill
        comment: 'Total amount at time of entry (bags * rate)'
      },
      { transaction }
    );

    // Step 3: Backfill existing entries with current rates from rice_hamali_rates
    console.log('📋 Step 3: Backfilling existing entries with rates...');
    await sequelize.query(`
      UPDATE rice_hamali_entries rhe
      SET 
        rate = rhr.rate_24_27,
        amount = (rhe.bags * rhr.rate_24_27)
      FROM rice_hamali_rates rhr
      WHERE rhe.rice_hamali_rate_id = rhr.id
        AND rhe.rate IS NULL
    `, { transaction });

    // Step 4: Make columns NOT NULL after backfill
    console.log('📋 Step 4: Making rate and amount columns NOT NULL...');
    await queryInterface.changeColumn(
      'rice_hamali_entries',
      'rate',
      {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Rate per bag at time of entry (snapshot from rice_hamali_rates)'
      },
      { transaction }
    );

    await queryInterface.changeColumn(
      'rice_hamali_entries',
      'amount',
      {
        type: sequelize.Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total amount at time of entry (bags * rate)'
      },
      { transaction }
    );

    // Step 5: Add indexes for performance
    console.log('📋 Step 5: Adding indexes...');
    await queryInterface.addIndex(
      'rice_hamali_entries',
      ['rate'],
      {
        name: 'idx_rice_hamali_entries_rate',
        transaction
      }
    );

    await queryInterface.addIndex(
      'rice_hamali_entries',
      ['amount'],
      {
        name: 'idx_rice_hamali_entries_amount',
        transaction
      }
    );

    await transaction.commit();
    console.log('✅ Migration completed successfully!');
    console.log('📊 Summary:');
    console.log('  - Added rate column to rice_hamali_entries');
    console.log('  - Added amount column to rice_hamali_entries');
    console.log('  - Backfilled existing entries with current rates');
    console.log('  - Added indexes for performance');
    console.log('  - Historical rates are now preserved!');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    console.log('🔧 Rolling back migration: Remove rate and amount from rice_hamali_entries...');

    // Remove indexes
    await queryInterface.removeIndex('rice_hamali_entries', 'idx_rice_hamali_entries_rate', { transaction });
    await queryInterface.removeIndex('rice_hamali_entries', 'idx_rice_hamali_entries_amount', { transaction });

    // Remove columns
    await queryInterface.removeColumn('rice_hamali_entries', 'rate', { transaction });
    await queryInterface.removeColumn('rice_hamali_entries', 'amount', { transaction });

    await transaction.commit();
    console.log('✅ Rollback completed successfully!');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
