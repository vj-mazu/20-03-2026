require('dotenv').config();
const { sequelize } = require('../config/database');

async function factoryReset() {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚨 DATABASE FACTORY RESET INITIATED 🚨');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    try {
        // 1. Authenticate
        await sequelize.authenticate();
        console.log('✅ Connected to Render Database.');

        // 2. Drop all tables
        console.log('⚠️  DELETING ALL DATA... This cannot be undone.');
        
        // This drops all tables defined in models and any other tables in the schema
        await sequelize.getQueryInterface().dropAllTables();
        
        console.log('✅ All tables dropped successfully.');
        console.log('✅ Database is now COMPLETELY EMPTY.');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('👉 ACTION REQUIRED:');
        console.log('1. Restart your Render Web Service.');
        console.log('2. The server will detect the empty DB and run all migrations automatically.');
        console.log('3. Log in with the default admin: ashish / ashish789');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        process.exit(0);
    } catch (error) {
        console.error('❌ Reset failed:', error.message);
        process.exit(1);
    }
}

// Ensure the user really wants to do this if running locally
if (process.env.CONFIRM_RESET === 'true') {
    factoryReset();
} else {
    console.log('❌ Reset aborted. You must set CONFIRM_RESET=true to run this script.');
    console.log('Example: $env:CONFIRM_RESET="true"; node scripts/factoryReset.js');
    process.exit(1);
}
