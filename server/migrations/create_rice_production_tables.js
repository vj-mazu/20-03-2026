const { sequelize } = require('../config/database');

async function migrate() {
  try {
    console.log('Starting rice production tables migration...');

    // Create Packaging table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS packagings (
        id SERIAL PRIMARY KEY,
        "brandName" VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(255) NOT NULL UNIQUE,
        "allottedKg" VARCHAR(2) NOT NULL CHECK ("allottedKg" IN ('25', '26', '30')),
        "isActive" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ Packagings table created');

    // Create RiceProductions table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rice_productions (
        id SERIAL PRIMARY KEY,
        "outturnId" INTEGER NOT NULL REFERENCES outturns(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        "productType" VARCHAR(50) NOT NULL CHECK ("productType" IN ('Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Sizer Broken', 'Rejection Broken', 'Broken', 'Zero Broken', 'Faram', 'Unpolished', 'RJ Rice 1', 'RJ Rice 2')),
        "quantityQuintals" DECIMAL(10, 2) NOT NULL,
        "packagingId" INTEGER NOT NULL REFERENCES packagings(id),
        bags INTEGER NOT NULL,
        "paddyBagsDeducted" INTEGER NOT NULL DEFAULT 0,
        "movementType" VARCHAR(20) NOT NULL CHECK ("movementType" IN ('kunchinittu', 'loading')),
        "locationCode" VARCHAR(255),
        "lorryNumber" VARCHAR(255),
        "billNumber" VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved')),
        "createdBy" INTEGER NOT NULL REFERENCES users(id),
        "approvedBy" INTEGER REFERENCES users(id),
        "approvedAt" TIMESTAMP WITH TIME ZONE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✓ RiceProductions table created');

    // Create indexes for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_outturn ON rice_productions("outturnId");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_date ON rice_productions(date);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_status ON rice_productions(status);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_location ON rice_productions("locationCode");
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_rice_productions_movement ON rice_productions("movementType");
    `);
    console.log('✓ Indexes created');

    console.log('✅ Rice production tables migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = migrate;
