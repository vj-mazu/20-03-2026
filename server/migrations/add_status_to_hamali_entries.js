const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add status column
    await queryInterface.addColumn('hamali_entries', 'status', {
      type: DataTypes.ENUM('pending', 'approved'),
      defaultValue: 'pending',
      allowNull: false
    });

    // Add approvedBy column
    await queryInterface.addColumn('hamali_entries', 'approved_by', {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    });

    // Add approvedAt column
    await queryInterface.addColumn('hamali_entries', 'approved_at', {
      type: DataTypes.DATE,
      allowNull: true
    });

    // Add index on status
    await queryInterface.addIndex('hamali_entries', ['status'], {
      name: 'idx_hamali_entries_status'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('hamali_entries', 'status');
    await queryInterface.removeColumn('hamali_entries', 'approved_by');
    await queryInterface.removeColumn('hamali_entries', 'approved_at');
  }
};
