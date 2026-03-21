const { sequelize } = require('../config/database');

async function updateRiceProductionProductTypes() {
  try {
    console.log('🔄 Updating rice_productions product types...');

    // Drop the old enum type and create a new one
    await sequelize.query(`
      ALTER TABLE rice_productions 
      ALTER COLUMN "productType" TYPE VARCHAR(50);
    `);

    console.log('✅ Converted productType to VARCHAR');

    // Now add the constraint
    await sequelize.query(`
      ALTER TABLE rice_productions 
      DROP CONSTRAINT IF EXISTS rice_productions_productType_check;
    `);

    await sequelize.query(`
      ALTER TABLE rice_productions 
      ADD CONSTRAINT rice_productions_productType_check 
      CHECK ("productType" IN ('Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Sizer Broken', 'Rejection Broken', 'Broken', 'Zero Broken', 'Faram', 'Unpolished', 'RJ Rice 1', 'RJ Rice 2'));
    `);

    console.log('✅ Rice production product types updated successfully');
  } catch (error) {
    console.error('❌ Error updating rice production product types:', error);
    // Don't throw - this migration is optional if table doesn't exist yet
  }
}

// Export both the function and an object with up method for compatibility
module.exports = updateRiceProductionProductTypes;
module.exports.up = async (queryInterface, Sequelize) => {
  return updateRiceProductionProductTypes();
};

if (require.main === module) {
  updateRiceProductionProductTypes()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
