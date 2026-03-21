require('dotenv').config();
const { Sequelize } = require('sequelize');

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('❌ No DATABASE_URL found in your .env file!');
  process.exit(1);
}

console.log('🔍 Testing connection to:', url.replace(/:([^:@]+)@/, ':****@'));

const sequelize = new Sequelize(url, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

async function test() {
  try {
    await sequelize.authenticate();
    console.log('✅ SUCCESS: Connection established successfully!');
    const [results] = await sequelize.query('SELECT current_user, current_database()');
    console.log('📊 Connection details:', results[0]);
  } catch (error) {
    if (error.name === 'SequelizeConnectionError' && error.message.includes('authentication failed')) {
      console.error('\n❌ AUTHENTICATION FAILED');
      console.error('Your password or project ID in the DATABASE_URL is incorrect.');
      console.error('\n💡 TROUBLESHOOTING TIPS:');
      console.error('1. Reset your Supabase password in Settings > Database.');
      console.error('2. Ensure special characters (@, #, :, /, %) are URL-encoded.');
      console.error('3. Check if you are using the correct connection string for project: jwrtkkixrycdensktpzn');
    } else {
      console.error('\n❌ CONNECTION ERROR:', error.message);
    }
  } finally {
    await sequelize.close();
  }
}

test();
