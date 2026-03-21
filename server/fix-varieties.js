const { sequelize } = require('./config/database');
const SampleEntry = require('./models/SampleEntry');

async function syncVarieties() {
  try {
    // We know 'Sum25 Rnr' needs to be 'SUM25 RNR2'
    // And 'Dec25 Rnr' might need to be 'DEC25 RNR1' or whatever DB has
    
    // Let's just update 'Sum25 Rnr' to 'SUM25 RNR2' manually since that was the failed operation
    const [results] = await sequelize.query(`
      UPDATE sample_entries 
      SET variety = 'SUM25 RNR2'
      WHERE variety = 'Sum25 Rnr' OR variety = 'SUM25 RNR'
    `);
    
    console.log('Fixed Sum25 Rnr entries:', results.rowCount || 'Success');

    const [results2] = await sequelize.query(`
      UPDATE sample_entries 
      SET variety = 'DEC25 RNR1'
      WHERE variety = 'Dec25 Rnr' OR variety = 'DEC25 RNR'
    `);
    
    console.log('Fixed Dec25 Rnr entries:', results2.rowCount || 'Success');

  } catch (error) {
    console.error('Error syncing:', error);
  } finally {
    process.exit(0);
  }
}

syncVarieties();
