const { sequelize } = require('../config/database');

async function recreateDatabase() {
    console.log('🚀 Starting Database Reset...');

    try {
        // 1. Authenticate
        await sequelize.authenticate();
        console.log('✅ Connected to database.');

        // 2. Drop all tables
        console.log('⚠️ Dropping all tables...');
        await sequelize.getQueryInterface().dropAllTables();
        console.log('✅ All tables dropped successfully.');

        console.log('\n✨ Database is now EMPTY.');
        console.log('👉 To recreate the schema, simply RESTART your server.');
        console.log('The server will automatically detect the empty DB and run all migrations.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Database reset failed:', error);
        process.exit(1);
    }
}

// Security confirmation check (optional but recommended in real apps)
recreateDatabase();
