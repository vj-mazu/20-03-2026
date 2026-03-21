const { sequelize } = require('../config/database');

async function addLooseMovementType() {
  try {
    console.log('🔄 Adding "loose" to arrivals movementType enum...');

    // Convert ENUM to VARCHAR temporarily
    await sequelize.query(`
      ALTER TABLE arrivals 
      ALTER COLUMN "movementType" TYPE VARCHAR(50);
    `);

    console.log('✅ Converted movementType to VARCHAR');

    // Drop old constraint if exists
    await sequelize.query(`
      ALTER TABLE arrivals 
      DROP CONSTRAINT IF EXISTS arrivals_movementType_check;
    `);

    // Add new constraint with 'loose' included
    await sequelize.query(`
      ALTER TABLE arrivals 
      ADD CONSTRAINT arrivals_movementType_check 
      CHECK ("movementType" IN ('purchase', 'shifting', 'production-shifting', 'for-production', 'loose'));
    `);

    console.log('✅ Added "loose" to movementType enum successfully');
  } catch (error) {
    console.error('❌ Error adding loose movement type:', error);
    throw error;
  }
}

// Export both the function and an object with up method for compatibility
module.exports = addLooseMovementType;
module.exports.up = async (queryInterface, Sequelize) => {
  return addLooseMovementType();
};

if (require.main === module) {
  addLooseMovementType()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
