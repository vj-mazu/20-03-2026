const { sequelize } = require('../config/database');

async function updateYieldPercentagePrecision() {
  try {
    console.log('🔄 Updating yield_percentage precision...');

    // Alter the yield_percentage column to DECIMAL(6,2)
    await sequelize.query(`
      ALTER TABLE outturns 
      ALTER COLUMN yield_percentage TYPE DECIMAL(6, 2);
    `);

    console.log('✅ Yield percentage precision updated successfully');
  } catch (error) {
    console.error('❌ Error updating yield percentage precision:', error);
    // Don't throw - this migration is optional if table doesn't exist yet
  }
}

// Export both the function and an object with up method for compatibility
module.exports = updateYieldPercentagePrecision;
module.exports.up = async (queryInterface, Sequelize) => {
  return updateYieldPercentagePrecision();
};

if (require.main === module) {
  updateYieldPercentagePrecision()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
