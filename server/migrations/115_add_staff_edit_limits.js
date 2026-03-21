/**
 * Migration 115: Add staff edit limit counters to sample_entries
 *
 * Tracks one-time staff edits for party name and bags.
 */

const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  try {
    const table = await queryInterface.describeTable('sample_entries');

    if (!table.staff_party_name_edits) {
      await queryInterface.addColumn('sample_entries', 'staff_party_name_edits', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }

    if (!table.staff_bags_edits) {
      await queryInterface.addColumn('sample_entries', 'staff_bags_edits', {
        type: sequelize.Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
  } catch (error) {
    console.error('Migration 115 error:', error.message);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  try {
    await queryInterface.removeColumn('sample_entries', 'staff_party_name_edits');
  } catch (error) {
    console.warn('Migration 115 down warning (staff_party_name_edits):', error.message);
  }

  try {
    await queryInterface.removeColumn('sample_entries', 'staff_bags_edits');
  } catch (error) {
    console.warn('Migration 115 down warning (staff_bags_edits):', error.message);
  }
}

module.exports = { up, down };
