module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('by_products', 'rjRice1', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });
    
    await queryInterface.addColumn('by_products', 'rjRice2', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('by_products', 'rjRice1');
    await queryInterface.removeColumn('by_products', 'rjRice2');
  }
};
