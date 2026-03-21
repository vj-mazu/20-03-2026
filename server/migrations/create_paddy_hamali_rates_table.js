const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('paddy_hamali_rates', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      workType: {
        type: DataTypes.STRING(100),
        allowNull: false,
        field: 'work_type'
      },
      workDetail: {
        type: DataTypes.STRING(200),
        allowNull: false,
        field: 'work_detail'
      },
      rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      isPerLorry: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_per_lorry'
      },
      hasMultipleOptions: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_multiple_options'
      },
      parentWorkType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        field: 'parent_work_type'
      },
      displayOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        field: 'display_order'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    // Create indexes
    await queryInterface.addIndex('paddy_hamali_rates', ['work_type'], {
      name: 'idx_paddy_hamali_rates_work_type'
    });

    // Insert default rates
    await queryInterface.bulkInsert('paddy_hamali_rates', [
      { work_type: 'Paddy Loading', work_detail: 'Lorry Loading', rate: 4.63, is_per_lorry: false, has_multiple_options: false, parent_work_type: null, display_order: 1, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Loose Tumbiddu', work_detail: 'Per Bag', rate: 4.94, is_per_lorry: false, has_multiple_options: false, parent_work_type: null, display_order: 2, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Paddy Unloading', work_detail: 'Sada', rate: 4.11, is_per_lorry: false, has_multiple_options: true, parent_work_type: null, display_order: 3, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Paddy Unloading', work_detail: 'KN (0 to 18 height)', rate: 7.71, is_per_lorry: false, has_multiple_options: true, parent_work_type: 'Paddy Unloading', display_order: 4, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Paddy Unloading', work_detail: 'KN (above 18 height) (add)', rate: 3.6, is_per_lorry: false, has_multiple_options: true, parent_work_type: 'Paddy Unloading', display_order: 5, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Paddy Cutting', work_detail: 'Paddy Cutting', rate: 2.06, is_per_lorry: false, has_multiple_options: false, parent_work_type: null, display_order: 6, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Plotting', work_detail: 'per bag', rate: 11.88, is_per_lorry: false, has_multiple_options: false, parent_work_type: null, display_order: 7, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Paddy Shifting', work_detail: 'Sada', rate: 3.52, is_per_lorry: false, has_multiple_options: true, parent_work_type: null, display_order: 8, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Paddy Shifting', work_detail: 'KN (0 to 18 height)', rate: 4.31, is_per_lorry: false, has_multiple_options: true, parent_work_type: 'Paddy Shifting', display_order: 9, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Paddy Filling with Stitching', work_detail: 'From Rashi/ Bunker', rate: 3.7, is_per_lorry: false, has_multiple_options: false, parent_work_type: null, display_order: 10, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Per Lorry', work_detail: 'Association Rate', rate: 62, is_per_lorry: true, has_multiple_options: true, parent_work_type: null, display_order: 11, created_at: new Date(), updated_at: new Date() },
      { work_type: 'Per Lorry', work_detail: 'Lorry Nitt Jama & Rope pulling', rate: 120, is_per_lorry: true, has_multiple_options: true, parent_work_type: 'Per Lorry', display_order: 12, created_at: new Date(), updated_at: new Date() }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('paddy_hamali_rates');
  }
};
