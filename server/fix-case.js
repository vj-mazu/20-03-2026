const { sequelize } = require('./config/database');

async function fixCase() {
  try {
    // 1. Get all varieties from Location that have uppercase
    // 2. Just update the sample_entries directly to Title Case
    
    // We updated to SUM25 RNR2 earlier or DEC25 RNR1
    const [res1] = await sequelize.query(`
      UPDATE sample_entries 
      SET variety = 'Sum25 Rnr2'
      WHERE LOWER(variety) = 'sum25 rnr2'
    `);
    console.log('Fixed Sum25 Rnr2 to Title Case:', res1.rowCount);

    const [res2] = await sequelize.query(`
      UPDATE sample_entries 
      SET variety = 'Dec25 Rnr1'
      WHERE LOWER(variety) = 'dec25 rnr1'
    `);
    console.log('Fixed Dec25 Rnr1 to Title Case:', res2.rowCount);
    
    // Also fix broker names in both SampleEntry and Arrival to Title Case
    const [res3] = await sequelize.query(`
      UPDATE sample_entries 
      SET broker_name = REPLACE(REPLACE(REPLACE(LOWER(broker_name), ' a', ' A'), ' b', ' B'), ' c', ' C') -- simple way to just leave it as is or we can let JavaScript do it
    `);

    // Let javascript do it for all sample entries to ensure Title Case
    const SampleEntry = require('./models/SampleEntry');
    const entries = await SampleEntry.findAll();
    let updated = 0;
    
    const toTitleCase = (str) => {
      if (!str) return str;
      return str.toLowerCase().replace(/(?:^|\\s)\\S/g, c => c.toUpperCase());
    };
    
    for (const entry of entries) {
      const oldVariety = entry.variety;
      const expectedVariety = toTitleCase(oldVariety);
      
      const oldBroker = entry.brokerName;
      const expectedBroker = toTitleCase(oldBroker);
      
      if (oldVariety !== expectedVariety || oldBroker !== expectedBroker) {
        await entry.update({ 
          variety: expectedVariety,
          brokerName: expectedBroker
        });
        updated++;
      }
    }
    console.log('Normalized Title Case for', updated, 'Sample Entries');

  } catch (error) {
    console.error('Error syncing:', error);
  } finally {
    process.exit(0);
  }
}

fixCase();
