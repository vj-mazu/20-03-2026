const { sequelize } = require('./config/database');
async function dump() {
  const [entries] = await sequelize.query('SELECT DISTINCT variety FROM sample_entries');
  const [varieties] = await sequelize.query('SELECT name FROM varieties');
  console.log('Sample Entries Varieties:');
  console.table(entries);
  console.log('Location Varieties:');
  console.table(varieties);
  process.exit(0);
}
dump();
