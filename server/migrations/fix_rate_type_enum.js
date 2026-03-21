const { sequelize } = require('../config/database');

async function fixRateTypeEnum() {
  try {
    console.log('🔄 Fixing rate_type enum...');

    // Drop the old enum type if it exists
    await sequelize.query(`
      DROP TYPE IF EXISTS enum_purchase_rates_rate_type_old CASCADE;
    `);
    console.log('✅ Dropped old enum type');

    // Check if the correct enum exists
    const [enumCheck] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'enum_purchase_rates_rate_type'
      ) as exists;
    `);

    if (!enumCheck[0].exists) {
      // Create the enum if it doesn't exist
      await sequelize.query(`
        CREATE TYPE enum_purchase_rates_rate_type AS ENUM('CDL', 'CDWB', 'MDL', 'MDWB');
      `);
      console.log('✅ Created rate_type enum');
    } else {
      console.log('✅ Rate_type enum already exists');
    }

    console.log('✅ Rate type enum fixed successfully');
  } catch (error) {
    console.error('❌ Error fixing rate type enum:', error.message);
    // Don't throw - allow server to continue
  }
}

module.exports = fixRateTypeEnum;

if (require.main === module) {
  fixRateTypeEnum()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
