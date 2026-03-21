const { sequelize } = require('../config/database');

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();

  try {
    // 1. Add CANCELLED to workflow_status enum safely
    try {
      await sequelize.query(`ALTER TYPE "enum_sample_entries_workflow_status" ADD VALUE IF NOT EXISTS 'CANCELLED';`, { transaction });
    } catch (enumErr) {
      console.log('Enum CANCELLED might already exist or DB is not postgres. Details:', enumErr.message);
    }

    // 2. Add cancel_remarks column if not exists
    const tableInfo = await queryInterface.describeTable('sample_entries');
    if (!tableInfo.cancel_remarks) {
      await queryInterface.addColumn(
        'sample_entries',
        'cancel_remarks',
        {
          type: sequelize.Sequelize.TEXT,
          allowNull: true
        },
        { transaction }
      );
    }

    await transaction.commit();
    console.log('✅ Migration: CANCELLED status and cancel_remarks added successfully.');
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Migration failed:', err.message);
    throw err;
  }
}

module.exports = { up };
