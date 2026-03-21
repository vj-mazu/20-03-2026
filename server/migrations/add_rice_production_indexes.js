const { sequelize } = require('../config/database');

async function addRiceProductionIndexes() {
  try {
    console.log('🔄 Adding indexes to rice_productions table...');

    // Index on outturnId for filtering by outturn
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_outturn_id 
      ON rice_productions ("outturnId");
    `);
    console.log('✅ Index on outturnId created');

    // Index on date for date range queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_date 
      ON rice_productions (date DESC);
    `);
    console.log('✅ Index on date created');

    // Index on productType for filtering
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_product_type 
      ON rice_productions ("productType");
    `);
    console.log('✅ Index on productType created');

    // Index on status for filtering pending/approved
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_status 
      ON rice_productions (status);
    `);
    console.log('✅ Index on status created');

    // Composite index on outturnId + date for common queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_outturn_date 
      ON rice_productions ("outturnId", date DESC);
    `);
    console.log('✅ Composite index on outturnId + date created');

    // Index on packagingId for joins
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_packaging_id 
      ON rice_productions ("packagingId");
    `);
    console.log('✅ Index on packagingId created');

    // Index on movementType for filtering
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_movement_type 
      ON rice_productions ("movementType");
    `);
    console.log('✅ Index on movementType created');

    // Index on locationCode for kunchinittu queries
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_location_code 
      ON rice_productions ("locationCode") 
      WHERE "locationCode" IS NOT NULL;
    `);
    console.log('✅ Index on locationCode created');

    console.log('✅ All rice production indexes added successfully');
  } catch (error) {
    console.error('❌ Error adding rice production indexes:', error);
  }
}

if (require.main === module) {
  addRiceProductionIndexes()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addRiceProductionIndexes;
