'use strict';

/**
 * Migration 117: Add party_name and location indexes for 20M+ scaling
 * 
 * Ensures these indexes exist even if the database is recreated.
 * These are added to the 'sample_entries' table.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const { sequelize } = require('../config/database');

    const indexes = [
      `CREATE INDEX IF NOT EXISTS idx_se_party_name ON sample_entries (party_name)`,
      `CREATE INDEX IF NOT EXISTS idx_se_location ON sample_entries (location)`
    ];

    for (const sql of indexes) {
      try {
        await sequelize.query(sql);
      } catch (error) {
        if (!error.message.includes('already exists')) {
          console.log(`Migration 117 index warning: ${error.message}`);
        }
      }
    }

    console.log('✅ Migration 117 complete: party_name and location indexes added');
  },

  down: async (queryInterface, Sequelize) => {
    const { sequelize } = require('../config/database');

    const dropIndexes = [
      'DROP INDEX IF EXISTS idx_se_party_name',
      'DROP INDEX IF EXISTS idx_se_location'
    ];

    for (const sql of dropIndexes) {
      await sequelize.query(sql).catch(() => { });
    }
  }
};
