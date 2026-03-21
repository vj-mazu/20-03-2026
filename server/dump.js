const { sequelize } = require('./config/database');

async function dump() {
  try {
    const [entries] = await sequelize.query('SELECT id, variety FROM sample_entries');
    const [varieties] = await sequelize.query('SELECT id, name FROM varieties');
    const fs = require('fs');
    fs.writeFileSync('dump.json', JSON.stringify({ entries, varieties }, null, 2));
    console.log('Dumped to dump.json');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
dump();
