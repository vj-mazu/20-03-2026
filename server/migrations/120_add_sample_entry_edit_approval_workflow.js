const { sequelize } = require('../config/database');

const ensureColumn = async (queryInterface, tableName, columnName, definition) => {
  const tableInfo = await queryInterface.describeTable(tableName);
  if (!tableInfo[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

module.exports = {
  async up(queryInterface = sequelize.getQueryInterface(), SequelizeLib = sequelize.Sequelize) {
    await ensureColumn(queryInterface, 'sample_entries', 'staff_entry_edit_allowance', {
      type: SequelizeLib.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
    await ensureColumn(queryInterface, 'sample_entries', 'staff_quality_edit_allowance', {
      type: SequelizeLib.INTEGER,
      allowNull: false,
      defaultValue: 1
    });

    const approvalColumns = [
      ['entry_edit_approval_status', { type: SequelizeLib.STRING(20), allowNull: true }],
      ['entry_edit_approval_reason', { type: SequelizeLib.TEXT, allowNull: true }],
      ['entry_edit_approval_requested_by', { type: SequelizeLib.INTEGER, allowNull: true }],
      ['entry_edit_approval_requested_at', { type: SequelizeLib.DATE, allowNull: true }],
      ['entry_edit_approval_approved_by', { type: SequelizeLib.INTEGER, allowNull: true }],
      ['entry_edit_approval_approved_at', { type: SequelizeLib.DATE, allowNull: true }],
      ['quality_edit_approval_status', { type: SequelizeLib.STRING(20), allowNull: true }],
      ['quality_edit_approval_reason', { type: SequelizeLib.TEXT, allowNull: true }],
      ['quality_edit_approval_requested_by', { type: SequelizeLib.INTEGER, allowNull: true }],
      ['quality_edit_approval_requested_at', { type: SequelizeLib.DATE, allowNull: true }],
      ['quality_edit_approval_approved_by', { type: SequelizeLib.INTEGER, allowNull: true }],
      ['quality_edit_approval_approved_at', { type: SequelizeLib.DATE, allowNull: true }]
    ];

    for (const [columnName, definition] of approvalColumns) {
      await ensureColumn(queryInterface, 'sample_entries', columnName, definition);
    }
  }
};
