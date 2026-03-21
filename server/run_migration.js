// Script to add 'RJ Broken' to the productType ENUM in PostgreSQL
// Run with: node run_migration.js

require('dotenv').config();
const { sequelize } = require('./config/database');

async function runMigration() {
    console.log('🔄 Connecting to database...');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Add 'RJ Broken' to the ENUM type
        console.log('🔄 Adding RJ Broken to productType ENUM...');

        try {
            await sequelize.query(`ALTER TYPE "enum_rice_productions_productType" ADD VALUE IF NOT EXISTS 'RJ Broken';`);
            console.log('✅ Successfully added RJ Broken to ENUM');
        } catch (enumError) {
            if (enumError.message.includes('already exists')) {
                console.log('ℹ️  RJ Broken already exists in ENUM, skipping...');
            } else if (enumError.message.includes('does not exist')) {
                // Try alternative ENUM name format used by Sequelize
                console.log('🔄 Trying alternative ENUM type name...');
                await sequelize.query(`ALTER TYPE "enum_rice_productions_product_type" ADD VALUE IF NOT EXISTS 'RJ Broken';`);
                console.log('✅ Successfully added RJ Broken to ENUM (alternative name)');
            } else {
                throw enumError;
            }
        }

        // Verify the change
        console.log('🔄 Verifying ENUM values...');
        const [results] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname LIKE '%rice_productions%' AND typname LIKE '%product%'
      );
    `);

        console.log('📋 Current ENUM values:', results.map(r => r.enumlabel).join(', '));

        console.log('\n✅ Migration completed successfully!');
        console.log('📝 You can now save RJ Broken entries from the rice production form.');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('SQL Error details:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

runMigration();
