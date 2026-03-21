const { sequelize } = require('../config/database');

async function addOutturnClearingFields() {
  try {
    console.log('🔄 Adding outturn clearing fields to outturns table...');

    // Add is_cleared column
    await sequelize.query(`
      ALTER TABLE outturns 
      ADD COLUMN IF NOT EXISTS is_cleared BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Column is_cleared added');

    // Add cleared_at column
    await sequelize.query(`
      ALTER TABLE outturns 
      ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMP;
    `);
    console.log('✅ Column cleared_at added');

    // Add cleared_by column with foreign key
    await sequelize.query(`
      ALTER TABLE outturns 
      ADD COLUMN IF NOT EXISTS cleared_by INTEGER REFERENCES users(id);
    `);
    console.log('✅ Column cleared_by added');

    // Add remaining_bags column
    await sequelize.query(`
      ALTER TABLE outturns 
      ADD COLUMN IF NOT EXISTS remaining_bags INTEGER;
    `);
    console.log('✅ Column remaining_bags added');

    // Add index for performance on is_cleared
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_outturns_is_cleared 
      ON outturns(is_cleared);
    `);
    console.log('✅ Index idx_outturns_is_cleared created');

    // Add comments for documentation
    await sequelize.query(`
      COMMENT ON COLUMN outturns.is_cleared 
      IS 'Indicates if the outturn has been cleared and remaining bags added back to stock';
    `);
    await sequelize.query(`
      COMMENT ON COLUMN outturns.cleared_at 
      IS 'Timestamp when the outturn was cleared';
    `);
    await sequelize.query(`
      COMMENT ON COLUMN outturns.cleared_by 
      IS 'User ID who cleared the outturn';
    `);
    await sequelize.query(`
      COMMENT ON COLUMN outturns.remaining_bags 
      IS 'Number of remaining bags added back to stock when outturn was cleared';
    `);
    console.log('✅ Column comments added');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error adding outturn clearing fields:', error);
    throw error;
  }
}

async function removeOutturnClearingFields() {
  try {
    console.log('🔄 Removing outturn clearing fields from outturns table...');

    // Drop indexes first
    await sequelize.query(`
      DROP INDEX IF EXISTS idx_outturns_is_cleared;
    `);
    console.log('✅ Index idx_outturns_is_cleared dropped');

    // Drop columns
    await sequelize.query(`
      ALTER TABLE outturns 
      DROP COLUMN IF EXISTS is_cleared,
      DROP COLUMN IF EXISTS cleared_at,
      DROP COLUMN IF EXISTS cleared_by,
      DROP COLUMN IF EXISTS remaining_bags;
    `);
    console.log('✅ Outturn clearing columns removed');

    console.log('✅ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Error removing outturn clearing fields:', error);
    throw error;
  }
}

if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'down') {
    removeOutturnClearingFields()
      .then(() => {
        console.log('Migration rollback completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration rollback failed:', error);
        process.exit(1);
      });
  } else {
    addOutturnClearingFields()
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

module.exports = { up: addOutturnClearingFields, down: removeOutturnClearingFields };
