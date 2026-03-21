const { sequelize } = require('../config/database');

async function addPaddyBagsDeductedColumn() {
  try {
    console.log('🔄 Adding paddy_bags_deducted column to rice_productions table...');

    // Add the paddy_bags_deducted column
    await sequelize.query(`
      ALTER TABLE rice_productions 
      ADD COLUMN IF NOT EXISTS paddy_bags_deducted INTEGER DEFAULT 0;
    `);
    console.log('✅ Column paddy_bags_deducted added');

    // Add comment to the column for documentation
    await sequelize.query(`
      COMMENT ON COLUMN rice_productions.paddy_bags_deducted 
      IS 'Number of paddy bags deducted (quintals × 3, rounded)';
    `);
    console.log('✅ Column comment added');

    // Backfill existing records with calculated values
    await sequelize.query(`
      UPDATE rice_productions 
      SET paddy_bags_deducted = ROUND("quantityQuintals" * 3)
      WHERE paddy_bags_deducted = 0 OR paddy_bags_deducted IS NULL;
    `);
    console.log('✅ Existing records backfilled with calculated paddy_bags_deducted values');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error adding paddy_bags_deducted column:', error);
    throw error;
  }
}

async function removePaddyBagsDeductedColumn() {
  try {
    console.log('🔄 Removing paddy_bags_deducted column from rice_productions table...');

    await sequelize.query(`
      ALTER TABLE rice_productions 
      DROP COLUMN IF EXISTS paddy_bags_deducted;
    `);
    console.log('✅ Column paddy_bags_deducted removed');

    console.log('✅ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Error removing paddy_bags_deducted column:', error);
    throw error;
  }
}

if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'down') {
    removePaddyBagsDeductedColumn()
      .then(() => {
        console.log('Migration rollback completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration rollback failed:', error);
        process.exit(1);
      });
  } else {
    addPaddyBagsDeductedColumn()
      .then(() => {
        console.log('Migration completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }
}

module.exports = { up: addPaddyBagsDeductedColumn, down: removePaddyBagsDeductedColumn };
