const { sequelize } = require('../config/database');

/**
 * Comprehensive System Enhancements Migration
 * - Creates hamali_entry_status table for action button status indicators
 * - Adds performance indexes for rice hamali queries
 * - Enhances rice stock foreign key relationships for palti data integrity
 * - Adds palti-specific indexes for improved query performance
 */

async function up() {
  try {
    console.log('🚀 Starting comprehensive system enhancements migration...');

    // 1. Create hamali_entry_status table for status tracking functionality
    console.log('📋 Creating hamali_entry_status table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS hamali_entry_status (
        id SERIAL PRIMARY KEY,
        entry_id INTEGER NOT NULL,
        entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN ('paddy_hamali', 'rice_hamali', 'other_hamali')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('saved', 'pending', 'error', 'editing')),
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        modified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        -- Ensure unique status per entry
        UNIQUE(entry_id, entry_type)
      )
    `);

    // Create indexes for hamali_entry_status table
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_hamali_status_entry 
      ON hamali_entry_status(entry_id, entry_type)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_hamali_status_modified 
      ON hamali_entry_status(last_updated DESC)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_hamali_status_type_status 
      ON hamali_entry_status(entry_type, status)
    `);

    console.log('✅ Created hamali_entry_status table with indexes');

    // 2. Add performance indexes for rice hamali queries
    console.log('📈 Adding performance indexes for rice hamali queries...');

    // Check if rice_hamali_entries table exists
    const [riceHamaliTableExists] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'rice_hamali_entries'
    `);

    if (riceHamaliTableExists.length > 0) {
      // Index on remarks for categorization (Main vs Other Hamali)
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_remarks_categorization 
        ON rice_hamali_entries(remarks) 
        WHERE remarks IS NOT NULL
      `);

      // Index on date for date-based queries
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_date 
        ON rice_hamali_entries(created_at DESC)
      `);

      // Index on entry_type for filtering (may not exist until migration 41)
      try {
        await sequelize.query(`
          CREATE INDEX IF NOT EXISTS idx_rice_hamali_entry_type 
          ON rice_hamali_entries(entry_type) 
          WHERE entry_type IS NOT NULL
        `);
      } catch (e) {
        console.log('⚠️ entry_type column not yet available, skipping index');
      }

      // Composite index for common query patterns
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_active_date 
        ON rice_hamali_entries(is_active, created_at DESC) 
        WHERE is_active = true
      `);

      console.log('✅ Added performance indexes for rice hamali queries');
    } else {
      console.log('⚠️ rice_hamali_entries table not found, skipping rice hamali indexes');
    }

    // 3. Enhance rice stock foreign key relationships for palti data integrity
    console.log('🔗 Enhancing rice stock foreign key relationships...');

    // Check if rice_stock_movements table exists
    const [tableExists] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'rice_stock_movements'
    `);

    if (tableExists.length > 0) {
      // Check if columns exist before adding foreign keys
      const [sourcePackagingColumn] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rice_stock_movements' AND column_name = 'source_packaging_id'
      `);

      const [targetPackagingColumn] = await sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'rice_stock_movements' AND column_name = 'target_packaging_id'
      `);

      // Add source_packaging_id foreign key if column exists and constraint doesn't exist
      if (sourcePackagingColumn.length > 0) {
        try {
          const [existingConstraint] = await sequelize.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'rice_stock_movements' 
            AND constraint_name = 'fk_source_packaging'
          `);

          if (existingConstraint.length === 0) {
            await sequelize.query(`
              ALTER TABLE rice_stock_movements 
              ADD CONSTRAINT fk_source_packaging 
              FOREIGN KEY (source_packaging_id) REFERENCES packagings(id) ON DELETE SET NULL
            `);
            console.log('✅ Added source_packaging foreign key constraint');
          } else {
            console.log('⚠️ Source packaging foreign key already exists');
          }
        } catch (error) {
          console.log('⚠️ Could not add source packaging foreign key:', error.message);
        }
      } else {
        console.log('⚠️ source_packaging_id column not found, skipping foreign key');
      }

      // Add target_packaging_id foreign key if column exists and constraint doesn't exist
      if (targetPackagingColumn.length > 0) {
        try {
          const [existingConstraint] = await sequelize.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'rice_stock_movements' 
            AND constraint_name = 'fk_target_packaging'
          `);

          if (existingConstraint.length === 0) {
            await sequelize.query(`
              ALTER TABLE rice_stock_movements 
              ADD CONSTRAINT fk_target_packaging 
              FOREIGN KEY (target_packaging_id) REFERENCES packagings(id) ON DELETE SET NULL
            `);
            console.log('✅ Added target_packaging foreign key constraint');
          } else {
            console.log('⚠️ Target packaging foreign key already exists');
          }
        } catch (error) {
          console.log('⚠️ Could not add target packaging foreign key:', error.message);
        }
      } else {
        console.log('⚠️ target_packaging_id column not found, skipping foreign key');
      }

      // 4. Add palti-specific indexes for improved query performance
      console.log('🏃 Adding palti-specific indexes...');

      // Index for palti queries by movement type and date
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_stock_palti_date 
        ON rice_stock_movements(movement_type, date DESC) 
        WHERE movement_type = 'palti'
      `);

      // Index for packaging queries
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_stock_packaging_source 
        ON rice_stock_movements(source_packaging_id) 
        WHERE source_packaging_id IS NOT NULL
      `);

      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_stock_packaging_target 
        ON rice_stock_movements(target_packaging_id) 
        WHERE target_packaging_id IS NOT NULL
      `);

      // Composite index for palti data queries
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_rice_stock_palti_complete 
        ON rice_stock_movements(movement_type, date, source_packaging_id, target_packaging_id) 
        WHERE movement_type = 'palti'
      `);

      console.log('✅ Added palti-specific indexes');
    } else {
      console.log('⚠️ rice_stock_movements table not found, skipping rice stock enhancements');
    }

    // 5. Add trigger for automatic updated_at timestamp on hamali_entry_status
    console.log('⚡ Adding automatic timestamp trigger...');
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION update_hamali_status_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await sequelize.query(`
      DROP TRIGGER IF EXISTS trigger_update_hamali_status_timestamp ON hamali_entry_status;
      CREATE TRIGGER trigger_update_hamali_status_timestamp
        BEFORE UPDATE ON hamali_entry_status
        FOR EACH ROW
        EXECUTE FUNCTION update_hamali_status_timestamp();
    `);

    console.log('✅ Added automatic timestamp trigger');

    // 6. Verify the migration
    console.log('🔍 Verifying migration results...');

    // Check hamali_entry_status table structure
    const [statusTableInfo] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'hamali_entry_status' 
      ORDER BY ordinal_position
    `);

    console.log('📋 hamali_entry_status table structure:');
    statusTableInfo.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Check indexes
    const [indexes] = await sequelize.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE tablename IN ('hamali_entry_status', 'rice_hamali_entries', 'rice_stock_movements')
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);

    console.log('📊 Created indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.tablename}.${idx.indexname}`);
    });

    console.log('🎉 Comprehensive system enhancements migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔄 Reverting comprehensive system enhancements...');

    // Drop hamali_entry_status table
    await sequelize.query(`DROP TABLE IF EXISTS hamali_entry_status CASCADE`);

    // Drop indexes (they will be dropped automatically with the table)
    console.log('✅ Reverted comprehensive system enhancements');

  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };

// Run migration if called directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}