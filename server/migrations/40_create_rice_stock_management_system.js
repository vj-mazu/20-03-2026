const { sequelize } = require('../config/database');

async function createRiceStockManagementSystem() {
  try {
    console.log('🔄 Creating Rice Stock Management System...');

    // Create rice_stock_movements table for Purchase and Sale transactions
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rice_stock_movements (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('purchase', 'sale')),
        product_type VARCHAR(50) NOT NULL,
        variety VARCHAR(100) NOT NULL DEFAULT 'Sum25 RNR Raw',
        bags INTEGER NOT NULL CHECK (bags > 0),
        bag_size_kg DECIMAL(10,2) NOT NULL DEFAULT 26.00,
        quantity_quintals DECIMAL(10,3) NOT NULL,
        packaging_id INTEGER REFERENCES packagings(id) ON DELETE RESTRICT,
        location_code VARCHAR(50) NOT NULL,
        from_location VARCHAR(100),
        to_location VARCHAR(100),
        rate_per_bag DECIMAL(10,2),
        total_amount DECIMAL(12,2),
        bill_number VARCHAR(50),
        lorry_number VARCHAR(20),
        party_name VARCHAR(100),
        remarks TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        approved_by INTEGER REFERENCES users(id) ON DELETE RESTRICT,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Created rice_stock_movements table');

    // Create rice_stock_balances table for Opening/Closing stock tracking
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rice_stock_balances (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        product_type VARCHAR(50) NOT NULL,
        variety VARCHAR(100) NOT NULL DEFAULT 'Sum25 RNR Raw',
        location_code VARCHAR(50) NOT NULL,
        packaging_id INTEGER REFERENCES packagings(id) ON DELETE RESTRICT,
        opening_stock_bags INTEGER NOT NULL DEFAULT 0,
        opening_stock_quintals DECIMAL(10,3) NOT NULL DEFAULT 0,
        production_bags INTEGER NOT NULL DEFAULT 0,
        production_quintals DECIMAL(10,3) NOT NULL DEFAULT 0,
        purchase_bags INTEGER NOT NULL DEFAULT 0,
        purchase_quintals DECIMAL(10,3) NOT NULL DEFAULT 0,
        sale_bags INTEGER NOT NULL DEFAULT 0,
        sale_quintals DECIMAL(10,3) NOT NULL DEFAULT 0,
        closing_stock_bags INTEGER NOT NULL DEFAULT 0,
        closing_stock_quintals DECIMAL(10,3) NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(date, product_type, variety, location_code, packaging_id)
      )
    `);

    console.log('✅ Created rice_stock_balances table');

    // Create ULTRA PERFORMANCE indexes for 3+ lakh records
    console.log('🚀 Creating ultra performance indexes...');

    // Primary indexes for rice_stock_movements
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_date 
      ON rice_stock_movements(date DESC)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_type_date 
      ON rice_stock_movements(movement_type, date DESC)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_product_date 
      ON rice_stock_movements(product_type, date DESC)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_location_date 
      ON rice_stock_movements(location_code, date DESC)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_status 
      ON rice_stock_movements(status)
    `);

    // Composite index for month-wise pagination (CRITICAL for performance)
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_movements_month_pagination 
      ON rice_stock_movements(EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), date DESC, id DESC)
    `);

    // Primary indexes for rice_stock_balances
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_balances_date 
      ON rice_stock_balances(date DESC)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_balances_product_date 
      ON rice_stock_balances(product_type, date DESC)
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_balances_location_date 
      ON rice_stock_balances(location_code, date DESC)
    `);

    // Composite index for stock lookups
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_stock_balances_lookup 
      ON rice_stock_balances(product_type, variety, location_code, packaging_id, date DESC)
    `);

    console.log('✅ Created ultra performance indexes');

    // Add rice stock movement types to existing rice_productions enum
    console.log('🔄 Updating rice_productions movement types...');
    
    try {
      await sequelize.query(`
        ALTER TYPE enum_rice_productions_movementtype 
        ADD VALUE IF NOT EXISTS 'purchase'
      `);
      
      await sequelize.query(`
        ALTER TYPE enum_rice_productions_movementtype 
        ADD VALUE IF NOT EXISTS 'sale'
      `);
      
      console.log('✅ Updated rice_productions movement types');
    } catch (error) {
      console.log('⚠️ Movement types may already exist:', error.message);
    }

    // Create function for automatic stock balance calculation
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION calculate_rice_stock_balance(
        p_date DATE,
        p_product_type VARCHAR,
        p_variety VARCHAR,
        p_location_code VARCHAR,
        p_packaging_id INTEGER
      ) RETURNS TABLE (
        opening_bags INTEGER,
        opening_quintals DECIMAL,
        production_bags INTEGER,
        production_quintals DECIMAL,
        purchase_bags INTEGER,
        purchase_quintals DECIMAL,
        sale_bags INTEGER,
        sale_quintals DECIMAL,
        closing_bags INTEGER,
        closing_quintals DECIMAL
      ) AS $$
      DECLARE
        prev_closing_bags INTEGER := 0;
        prev_closing_quintals DECIMAL := 0;
        prod_bags INTEGER := 0;
        prod_quintals DECIMAL := 0;
        purch_bags INTEGER := 0;
        purch_quintals DECIMAL := 0;
        sale_bags INTEGER := 0;
        sale_quintals DECIMAL := 0;
      BEGIN
        -- Get previous day's closing stock
        SELECT COALESCE(rsb.closing_stock_bags, 0), COALESCE(rsb.closing_stock_quintals, 0)
        INTO prev_closing_bags, prev_closing_quintals
        FROM rice_stock_balances rsb
        WHERE rsb.product_type = p_product_type
          AND rsb.variety = p_variety
          AND rsb.location_code = p_location_code
          AND rsb.packaging_id = p_packaging_id
          AND rsb.date < p_date
        ORDER BY rsb.date DESC
        LIMIT 1;

        -- Get production for the day
        SELECT COALESCE(SUM(rp.bags), 0), COALESCE(SUM(rp."quantityQuintals"), 0)
        INTO prod_bags, prod_quintals
        FROM rice_productions rp
        WHERE rp.date = p_date
          AND rp."productType" = p_product_type
          AND rp."locationCode" = p_location_code
          AND rp."packagingId" = p_packaging_id
          AND rp.status = 'approved';

        -- Get purchases for the day
        SELECT COALESCE(SUM(rsm.bags), 0), COALESCE(SUM(rsm.quantity_quintals), 0)
        INTO purch_bags, purch_quintals
        FROM rice_stock_movements rsm
        WHERE rsm.date = p_date
          AND rsm.movement_type = 'purchase'
          AND rsm.product_type = p_product_type
          AND rsm.variety = p_variety
          AND rsm.location_code = p_location_code
          AND rsm.packaging_id = p_packaging_id
          AND rsm.status = 'approved';

        -- Get sales for the day
        SELECT COALESCE(SUM(rsm.bags), 0), COALESCE(SUM(rsm.quantity_quintals), 0)
        INTO sale_bags, sale_quintals
        FROM rice_stock_movements rsm
        WHERE rsm.date = p_date
          AND rsm.movement_type = 'sale'
          AND rsm.product_type = p_product_type
          AND rsm.variety = p_variety
          AND rsm.location_code = p_location_code
          AND rsm.packaging_id = p_packaging_id
          AND rsm.status = 'approved';

        -- Return calculated values
        RETURN QUERY SELECT 
          prev_closing_bags as opening_bags,
          prev_closing_quintals as opening_quintals,
          prod_bags as production_bags,
          prod_quintals as production_quintals,
          purch_bags as purchase_bags,
          purch_quintals as purchase_quintals,
          sale_bags as sale_bags,
          sale_quintals as sale_quintals,
          (prev_closing_bags + prod_bags + purch_bags - sale_bags) as closing_bags,
          (prev_closing_quintals + prod_quintals + purch_quintals - sale_quintals) as closing_quintals;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('✅ Created stock balance calculation function');

    console.log('✅ Rice Stock Management System created successfully!');

  } catch (error) {
    console.error('❌ Error creating Rice Stock Management System:', error.message);
    throw error;
  }
}

module.exports = createRiceStockManagementSystem;