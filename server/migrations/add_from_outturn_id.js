const { sequelize } = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addFromOutturnIdColumn() {
  try {
    console.log('🔧 Starting migration: add_from_outturn_id_column');
    
    // Check if column already exists
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'arrivals' 
      AND column_name = 'fromOutturnId'
    `, { type: QueryTypes.SELECT });
    
    if (columns) {
      console.log('✅ Column fromOutturnId already exists, skipping migration');
      return;
    }
    
    // Add the fromOutturnId column
    await sequelize.query(`
      ALTER TABLE arrivals 
      ADD COLUMN "fromOutturnId" INTEGER NULL 
      REFERENCES outturns(id)
    `);
    
    console.log('✅ Added fromOutturnId column to arrivals table');
    
    // Add index for performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_arrivals_from_outturn 
      ON arrivals("fromOutturnId")
    `);
    
    console.log('✅ Added index for fromOutturnId');
    
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  addFromOutturnIdColumn()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = addFromOutturnIdColumn;
