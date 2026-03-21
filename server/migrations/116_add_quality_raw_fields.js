const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addColumn('quality_parameters', 'moisture_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'dry_moisture_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'cutting_1_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'cutting_2_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'bend_1_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'bend_2_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'mix_s_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'mix_l_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'mix_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'kandu_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'oil_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'sk_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'grains_count_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'wb_r_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'wb_bk_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'wb_t_raw', { type: DataTypes.STRING(30), allowNull: true });
    await queryInterface.addColumn('quality_parameters', 'paddy_wb_raw', { type: DataTypes.STRING(30), allowNull: true });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('quality_parameters', 'paddy_wb_raw');
    await queryInterface.removeColumn('quality_parameters', 'wb_t_raw');
    await queryInterface.removeColumn('quality_parameters', 'wb_bk_raw');
    await queryInterface.removeColumn('quality_parameters', 'wb_r_raw');
    await queryInterface.removeColumn('quality_parameters', 'grains_count_raw');
    await queryInterface.removeColumn('quality_parameters', 'sk_raw');
    await queryInterface.removeColumn('quality_parameters', 'oil_raw');
    await queryInterface.removeColumn('quality_parameters', 'kandu_raw');
    await queryInterface.removeColumn('quality_parameters', 'mix_raw');
    await queryInterface.removeColumn('quality_parameters', 'mix_l_raw');
    await queryInterface.removeColumn('quality_parameters', 'mix_s_raw');
    await queryInterface.removeColumn('quality_parameters', 'bend_2_raw');
    await queryInterface.removeColumn('quality_parameters', 'bend_1_raw');
    await queryInterface.removeColumn('quality_parameters', 'cutting_2_raw');
    await queryInterface.removeColumn('quality_parameters', 'cutting_1_raw');
    await queryInterface.removeColumn('quality_parameters', 'dry_moisture_raw');
    await queryInterface.removeColumn('quality_parameters', 'moisture_raw');
  }
};
