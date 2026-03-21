'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableInfo = await queryInterface.describeTable('quality_parameters');

    if (!tableInfo.smell_has) {
      await queryInterface.addColumn('quality_parameters', 'smell_has', {
        type: Sequelize.BOOLEAN,
        allowNull: true,
        defaultValue: false
      });
      console.log('✅ Added smell_has column to quality_parameters');
    }

    if (!tableInfo.smell_type) {
      await queryInterface.addColumn('quality_parameters', 'smell_type', {
        type: Sequelize.STRING(30),
        allowNull: true
      });
      console.log('✅ Added smell_type column to quality_parameters');
    }
  },

  down: async (queryInterface) => {
    try {
      await queryInterface.removeColumn('quality_parameters', 'smell_has');
    } catch (err) {
      console.log('⚠️ Could not remove smell_has:', err.message);
    }
    try {
      await queryInterface.removeColumn('quality_parameters', 'smell_type');
    } catch (err) {
      console.log('⚠️ Could not remove smell_type:', err.message);
    }
  }
};
