const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add worker_name and batch_number columns to paddy_hamali_entries
    await queryInterface.addColumn('paddy_hamali_entries', 'worker_name', {
      type: DataTypes.STRING(100),
      allowNull: true,
      defaultValue: null
    });

    await queryInterface.addColumn('paddy_hamali_entries', 'batch_number', {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
    });

    // Add index for better performance
    await queryInterface.addIndex('paddy_hamali_entries', ['worker_name'], {
      name: 'idx_paddy_hamali_entries_worker_name'
    });

    console.log('✅ Added worker_name and batch_number columns to paddy_hamali_entries');
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the added columns
    await queryInterface.removeIndex('paddy_hamali_entries', 'idx_paddy_hamali_entries_worker_name');
    await queryInterface.removeColumn('paddy_hamali_entries', 'batch_number');
    await queryInterface.removeColumn('paddy_hamali_entries', 'worker_name');
  }
};