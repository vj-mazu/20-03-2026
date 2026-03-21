const { sequelize } = require('../config/database');

/**
 * Migration: Add performance indexes for handling large datasets
 * This will significantly improve query performance for 2 lakh+ records
 */

async function up() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Adding performance indexes...');

  // Define all indexes to create
  const indexes = [
    // Arrivals table indexes
    { table: 'arrivals', columns: ['date'], name: 'idx_arrivals_date' },
    { table: 'arrivals', columns: ['status'], name: 'idx_arrivals_status' },
    { table: 'arrivals', columns: ['movementType'], name: 'idx_arrivals_movement_type' },
    { table: 'arrivals', columns: ['date', 'status'], name: 'idx_arrivals_date_status' },
    { table: 'arrivals', columns: ['createdBy'], name: 'idx_arrivals_created_by' },
    { table: 'arrivals', columns: ['date', 'movementType'], name: 'idx_arrivals_date_movement' },
    // Hamali entries indexes
    { table: 'hamali_entries', columns: ['date'], name: 'idx_hamali_entries_date' },
    { table: 'hamali_entries', columns: ['status'], name: 'idx_hamali_entries_status' },
    { table: 'hamali_entries', columns: ['arrivalId'], name: 'idx_hamali_entries_arrival' },
    { table: 'hamali_entries', columns: ['date', 'status'], name: 'idx_hamali_entries_date_status' }
  ];

  for (const idx of indexes) {
    try {
      await queryInterface.addIndex(idx.table, idx.columns, {
        name: idx.name,
        concurrently: true
      });
      console.log(`✅ Created index: ${idx.name}`);
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        // Index already exists - this is fine, skip it
      } else {
        console.log(`⚠️ Skipped index ${idx.name}: ${error.message}`);
      }
    }
  }

  console.log('✅ Performance indexes migration complete!');
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();

  console.log('Removing performance indexes...');

  try {
    // Remove arrivals indexes
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_date');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_status');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_movement_type');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_date_status');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_created_by');
    await queryInterface.removeIndex('arrivals', 'idx_arrivals_date_movement');

    // Remove hamali entries indexes
    await queryInterface.removeIndex('hamali_entries', 'idx_hamali_entries_date');
    await queryInterface.removeIndex('hamali_entries', 'idx_hamali_entries_status');
    await queryInterface.removeIndex('hamali_entries', 'idx_hamali_entries_arrival');
    await queryInterface.removeIndex('hamali_entries', 'idx_hamali_entries_date_status');

    console.log('✅ Performance indexes removed successfully!');
  } catch (error) {
    console.error('Error removing indexes:', error);
    throw error;
  }
}

module.exports = { up, down };
