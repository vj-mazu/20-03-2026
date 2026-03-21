'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const fieldsToChange = ['mix_s', 'mix_l', 'mix', 'kandu', 'oil', 'sk'];
    
    for (const field of fieldsToChange) {
      await queryInterface.sequelize.query(`
        ALTER TABLE quality_parameters ALTER COLUMN ${field} TYPE VARCHAR(20) USING ${field}::text;
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    const fieldsToChange = ['mix_s', 'mix_l', 'mix', 'kandu', 'oil', 'sk'];
    
    for (const field of fieldsToChange) {
      await queryInterface.sequelize.query(`
        ALTER TABLE quality_parameters ALTER COLUMN ${field} TYPE NUMERIC(5,2) USING NULLIF(regexp_replace(${field}, '[^0-9.]', '', 'g'), '')::numeric;
      `);
    }
  }
};
