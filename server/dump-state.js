const { sequelize } = require('./config/database');

async function dump() {
  try {
    const [entries] = await sequelize.query('SELECT variety, COUNT(*) as count FROM sample_entries GROUP BY variety');
    const [varieties] = await sequelize.query('SELECT name FROM varieties');
    const [rice] = await sequelize.query('SELECT name FROM rice_varieties');
    const fs = require('fs');
    fs.writeFileSync('db-state.json', JSON.stringify({ entries, varieties, rice }, null, 2));
    console.log('Saved to db-state.json');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
dump();
