const { sequelize } = require('../config/database');

module.exports = {
  up: async () => {
    const transaction = await sequelize.transaction();

    try {
      console.log('🚀 Migration 43: Creating Automatic Rice Hamali System...');

      // 1. First, ensure rice_hamali_entries table has proper structure
      console.log('📋 Step 1: Ensuring rice_hamali_entries table structure...');

      await sequelize.query(`
        -- Ensure rice_hamali_entries table exists with all required columns
        CREATE TABLE IF NOT EXISTS rice_hamali_entries (
          id SERIAL PRIMARY KEY,
          rice_production_id INTEGER REFERENCES rice_productions(id),
          rice_stock_movement_id INTEGER REFERENCES rice_stock_movements(id),
          entry_type VARCHAR(50),
          rice_hamali_rate_id INTEGER NOT NULL REFERENCES rice_hamali_rates(id),
          bags INTEGER NOT NULL CHECK (bags > 0),
          remarks TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_by INTEGER NOT NULL REFERENCES users(id),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          
          -- Ensure at least one of rice_production_id or rice_stock_movement_id is not null
          CONSTRAINT rice_hamali_entries_source_check 
            CHECK (rice_production_id IS NOT NULL OR rice_stock_movement_id IS NOT NULL)
        );
      `, { transaction });

      // 2. Add indexes for performance
      console.log('📋 Step 2: Adding performance indexes...');

      await sequelize.query(`
        -- Add indexes if they don't exist
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_rice_production 
          ON rice_hamali_entries(rice_production_id);
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_rice_stock_movement 
          ON rice_hamali_entries(rice_stock_movement_id);
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_rate 
          ON rice_hamali_entries(rice_hamali_rate_id);
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_active 
          ON rice_hamali_entries(is_active);
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_entry_type 
          ON rice_hamali_entries(entry_type);
        CREATE INDEX IF NOT EXISTS idx_rice_hamali_entries_created_at 
          ON rice_hamali_entries(created_at);
      `, { transaction });

      // 3. Create function to automatically create rice hamali entries
      console.log('📋 Step 3: Creating automatic rice hamali entry function...');

      await sequelize.query(`
        -- Drop function if exists
        DROP FUNCTION IF EXISTS create_automatic_rice_hamali_entry();
        
        -- Create function that DOES NOT create automatic hamali entries for rice_stock_movements
        -- Purchase, Sale, and Palti movements do not get automatic hamali entries
        -- Users must manually add hamali entries if needed
        CREATE OR REPLACE FUNCTION create_automatic_rice_hamali_entry()
        RETURNS TRIGGER AS $$
        BEGIN
          -- DISABLED: No automatic hamali entries for rice_stock_movements
          -- Purchase, Sale, and Palti movements do not get automatic hamali entries
          -- Users must manually add hamali entries if needed
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // 4. Create trigger to automatically create rice hamali entries
      console.log('📋 Step 4: Creating automatic rice hamali trigger...');

      await sequelize.query(`
        -- Drop trigger if exists
        DROP TRIGGER IF EXISTS trigger_auto_create_rice_hamali ON rice_stock_movements;
        
        -- Create trigger
        CREATE TRIGGER trigger_auto_create_rice_hamali
          AFTER INSERT OR UPDATE ON rice_stock_movements
          FOR EACH ROW
          EXECUTE FUNCTION create_automatic_rice_hamali_entry();
      `, { transaction });

      // 5. Create function for rice production hamali entries
      console.log('📋 Step 5: Creating rice production hamali function...');

      await sequelize.query(`
        -- Drop function if exists
        DROP FUNCTION IF EXISTS create_rice_production_hamali_entry();
        
        -- Create function for rice production hamali entries
        CREATE OR REPLACE FUNCTION create_rice_production_hamali_entry()
        RETURNS TRIGGER AS $$
        DECLARE
          default_rate_id INTEGER;
          entry_bags INTEGER;
        BEGIN
          -- Only create hamali entries for approved rice productions
          IF NEW.status = 'approved' AND (OLD IS NULL OR OLD.status != 'approved') THEN
            
            -- Get default rice hamali rate for production
            SELECT id INTO default_rate_id
            FROM rice_hamali_rates 
            WHERE is_active = true 
            AND (
              work_type ILIKE '%production%' OR 
              work_type ILIKE '%packing%' OR
              work_type ILIKE '%kata%'
            )
            ORDER BY display_order ASC, id ASC
            LIMIT 1;
            
            -- Fallback to any active rate
            IF default_rate_id IS NULL THEN
              SELECT id INTO default_rate_id
              FROM rice_hamali_rates 
              WHERE is_active = true 
              ORDER BY display_order ASC, id ASC
              LIMIT 1;
            END IF;
            
            -- Only proceed if we have a rate
            IF default_rate_id IS NOT NULL THEN
              -- Calculate entry bags
              entry_bags := LEAST(NEW.bags, 10);
              
              -- Insert rice hamali entry
              INSERT INTO rice_hamali_entries (
                rice_production_id,
                entry_type,
                rice_hamali_rate_id,
                bags,
                remarks,
                is_active,
                created_by,
                created_at,
                updated_at
              ) VALUES (
                NEW.id,
                'production',
                default_rate_id,
                entry_bags,
                'Auto-created for production - ' || COALESCE(NEW."productType", 'Rice') || ' | Movement: ' || COALESCE(NEW."movementType"::text, 'production'),
                true,
                NEW."createdBy",
                NOW(),
                NOW()
              );
              
              -- Log the creation
              RAISE NOTICE 'Auto-created rice hamali entry for rice production ID: %, bags: %', NEW.id, entry_bags;
            END IF;
          END IF;
          
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // 6. Create trigger for rice productions
      console.log('📋 Step 6: Creating rice production hamali trigger...');

      await sequelize.query(`
        -- Drop trigger if exists
        DROP TRIGGER IF EXISTS trigger_auto_create_rice_production_hamali ON rice_productions;
        
        -- Create trigger
        CREATE TRIGGER trigger_auto_create_rice_production_hamali
          AFTER INSERT OR UPDATE ON rice_productions
          FOR EACH ROW
          EXECUTE FUNCTION create_rice_production_hamali_entry();
      `, { transaction });

      // 7. Create sample rice hamali entries for existing approved movements/productions
      console.log('📋 Step 7: Creating sample entries for existing approved records...');

      // For existing approved rice stock movements without hamali entries
      await sequelize.query(`
        INSERT INTO rice_hamali_entries (
          rice_stock_movement_id,
          entry_type,
          rice_hamali_rate_id,
          bags,
          remarks,
          is_active,
          created_by,
          created_at,
          updated_at
        )
        SELECT 
          rsm.id,
          rsm.movement_type,
          (SELECT id FROM rice_hamali_rates WHERE is_active = true ORDER BY display_order ASC, id ASC LIMIT 1),
          LEAST(rsm.bags, 10),
          'Migration auto-created for ' || rsm.movement_type || ' - ' || COALESCE(rsm.variety, 'Rice') || ' | Location: ' || COALESCE(rsm.location_code, 'Unknown'),
          true,
          rsm.created_by,
          rsm.created_at,
          rsm.updated_at
        FROM rice_stock_movements rsm
        WHERE rsm.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM rice_hamali_entries rhe 
          WHERE rhe.rice_stock_movement_id = rsm.id
        )
        AND EXISTS (SELECT 1 FROM rice_hamali_rates WHERE is_active = true);
      `, { transaction });

      // For existing approved rice productions without hamali entries
      await sequelize.query(`
        INSERT INTO rice_hamali_entries (
          rice_production_id,
          entry_type,
          rice_hamali_rate_id,
          bags,
          remarks,
          is_active,
          created_by,
          created_at,
          updated_at
        )
        SELECT 
          rp.id,
          'production',
          (SELECT id FROM rice_hamali_rates WHERE is_active = true ORDER BY display_order ASC, id ASC LIMIT 1),
          LEAST(rp.bags, 10),
          'Migration auto-created for production - ' || COALESCE(rp."productType", 'Rice') || ' | Movement: ' || COALESCE(rp."movementType"::text, 'production'),
          true,
          rp."createdBy",
          rp."createdAt",
          rp."updatedAt"
        FROM rice_productions rp
        WHERE rp.status = 'approved'
        AND NOT EXISTS (
          SELECT 1 FROM rice_hamali_entries rhe 
          WHERE rhe.rice_production_id = rp.id
        )
        AND EXISTS (SELECT 1 FROM rice_hamali_rates WHERE is_active = true);
      `, { transaction });

      // 8. Update table statistics
      console.log('📋 Step 8: Updating table statistics...');

      await sequelize.query(`
        -- Update table statistics for better query performance
        ANALYZE rice_hamali_entries;
        ANALYZE rice_stock_movements;
        ANALYZE rice_productions;
        ANALYZE rice_hamali_rates;
      `, { transaction });

      await transaction.commit();

      // 9. Verify the migration
      console.log('📋 Step 9: Verifying migration results...');

      const [hamaliCount] = await sequelize.query(`
        SELECT COUNT(*) as count FROM rice_hamali_entries WHERE is_active = true
      `);

      const [stockMovementCount] = await sequelize.query(`
        SELECT COUNT(*) as count FROM rice_stock_movements WHERE status = 'approved'
      `);

      const [productionCount] = await sequelize.query(`
        SELECT COUNT(*) as count FROM rice_productions WHERE status = 'approved'
      `);

      console.log('✅ Migration 43 completed successfully!');
      console.log(`📊 Results:`);
      console.log(`   - Rice Hamali Entries: ${hamaliCount[0].count}`);
      console.log(`   - Approved Stock Movements: ${stockMovementCount[0].count}`);
      console.log(`   - Approved Productions: ${productionCount[0].count}`);
      console.log(`🎉 Automatic Rice Hamali system is now active!`);

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration 43 failed:', error);
      throw error;
    }
  },

  down: async () => {
    const transaction = await sequelize.transaction();

    try {
      console.log('🔄 Rolling back Migration 43: Removing Automatic Rice Hamali System...');

      // Remove triggers
      await sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_auto_create_rice_hamali ON rice_stock_movements;
        DROP TRIGGER IF EXISTS trigger_auto_create_rice_production_hamali ON rice_productions;
      `, { transaction });

      // Remove functions
      await sequelize.query(`
        DROP FUNCTION IF EXISTS create_automatic_rice_hamali_entry();
        DROP FUNCTION IF EXISTS create_rice_production_hamali_entry();
      `, { transaction });

      // Remove auto-created entries (COMMENTED OUT to prevent data loss)
      // await sequelize.query(`
      //   DELETE FROM rice_hamali_entries 
      //   WHERE remarks LIKE 'Migration auto-created%' OR remarks LIKE 'Auto-created%';
      // `, { transaction });

      await transaction.commit();
      console.log('✅ Migration 43 rollback completed');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration 43 rollback failed:', error);
      throw error;
    }
  }
};