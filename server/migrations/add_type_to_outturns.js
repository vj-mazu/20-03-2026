const { sequelize } = require('../config/database');

async function addTypeToOutturns() {
  try {
    console.log('🔄 Adding type column to outturns table...');

    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'outturns' AND column_name = 'type';
    `);

    if (results.length > 0) {
      console.log('ℹ️  Column type already exists, skipping...');
      return;
    }

    // Create ENUM type if it doesn't exist
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE outturn_type_enum AS ENUM ('Raw', 'Steam');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ ENUM type outturn_type_enum created or already exists');

    // Add the type column with default value 'Raw'
    await sequelize.query(`
      ALTER TABLE outturns 
      ADD COLUMN type outturn_type_enum NOT NULL DEFAULT 'Raw';
    `);
    console.log('✅ Column type added with default value Raw');

    // Add comment to the column for documentation
    await sequelize.query(`
      COMMENT ON COLUMN outturns.type 
      IS 'Processing type: Raw or Steam';
    `);
    console.log('✅ Column comment added');

    // Update existing records to have 'Raw' as default (already done by DEFAULT, but explicit for clarity)
    await sequelize.query(`
      UPDATE outturns 
      SET type = 'Raw'
      WHERE type IS NULL;
    `);
    console.log('✅ Existing records set to Raw type');

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error adding type column:', error);
    throw error;
  }
}

async function removeTypeFromOutturns() {
  try {
    console.log('🔄 Removing type column from outturns table...');

    // Drop the column
    await sequelize.query(`
      ALTER TABLE outturns 
      DROP COLUMN IF EXISTS type;
    `);
    console.log('✅ Column type removed');

    // Drop the ENUM type
    await sequelize.query(`
      DROP TYPE IF EXISTS outturn_type_enum;
    `);
    console.log('✅ ENUM type outturn_type_enum removed');

    console.log('✅ Rollback completed successfully');
  } catch (error) {
    console.error('❌ Error removing type column:', error);
    throw error;
  }
}

if (require.main === module) {
  const action = process.argv[2];
  
  if (action === 'down') {
    removeTypeFromOutturns()
      .then(() => {
        console.log('Migration rollback completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Migration rollback failed:', error);
        process.exit(1);
      });
  } else {
    addTypeToOutturns()
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

module.exports = { up: addTypeToOutturns, down: removeTypeFromOutturns };
