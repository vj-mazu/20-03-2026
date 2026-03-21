/**
 * Run All Migrations
 * 
 * This script runs all migrations in the migrations/ folder.
 * Use with caution as it will attempt to run everything.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sequelize } = require('./config/database');

async function runAllMigrations() {
    console.log('🚀 Starting All Migrations...\n');

    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.js'))
            .sort();

        const queryInterface = sequelize.getQueryInterface();

        for (const file of files) {
            console.log(`📋 Running migration: ${file}`);
            try {
                const migration = require(path.join(migrationsDir, file));

                if (typeof migration === 'function') {
                    await migration();
                } else if (migration.up) {
                    await migration.up(queryInterface, sequelize.Sequelize);
                } else {
                    console.log(`  ⚠️  No up function found in ${file}, skipping.`);
                    continue;
                }

                console.log(`  ✅ Successfully ran ${file}\n`);
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('already exist')) {
                    console.log(`  ℹ️  Elements already exist, skipping.\n`);
                } else {
                    console.error(`  ❌ Error running ${file}:`, error.message, '\n');
                }
            }
        }

        console.log('✅ All migrations check complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration script failed:', error);
        process.exit(1);
    }
}

runAllMigrations();
