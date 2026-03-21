const { sequelize } = require('../config/database');

const ensureColumn = async (queryInterface, tableName, columnName, definition) => {
  const tableInfo = await queryInterface.describeTable(tableName);
  if (!tableInfo[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

module.exports = {
  async up(queryInterface = sequelize.getQueryInterface(), SequelizeLib = sequelize.Sequelize) {
    await ensureColumn(queryInterface, 'sample_entries', 'quality_attempt_details', {
      type: SequelizeLib.JSONB,
      allowNull: true,
      defaultValue: []
    });

    await ensureColumn(queryInterface, 'sample_entries', 'quality_report_attempts', {
      type: SequelizeLib.INTEGER,
      allowNull: true,
      defaultValue: 0
    });
  }
};
