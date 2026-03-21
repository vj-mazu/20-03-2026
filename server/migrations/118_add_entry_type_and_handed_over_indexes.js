'use strict';

/**
 * Migration 118: Add entry_type and sample_given_to_office indexes for 20M+ scaling
 * 
 * Ensures the 'Paddy Sample Reports' tabs and 'Given to Office' visibility filters are extremely fast.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { sequelize } = require('../config/database');

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_se_entry_type ON sample_entries (entry_type)`,
      `CREATE INDEX IF NOT EXISTS idx_se_sample_given_to_office ON sample_entries (sample_given_to_office)`
    ];

    for (const sql of indexes) {
      try {
        await sequelize.query(sql);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`Migration 118 index warning: ${error.message}`);
        }
      }
    }

    console.log('✅ Migration 118 complete: entry_type and sample_given_to_office indexes added');
  },

  down: async (queryInterface, Sequelize) => {
    const { sequelize } = require('../config/database');

    const dropIndexes = [
      'DROP INDEX IF EXISTS idx_se_entry_type',
      'DROP INDEX IF EXISTS idx_se_sample_given_to_office'
    ];

    for (const sql of dropIndexes) {
      await sequelize.query(sql).catch(() => { });
    }
  }
};
