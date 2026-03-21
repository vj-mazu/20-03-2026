const { sequelize } = require('./config/database');
const SampleEntry = require('./models/SampleEntry');
const Arrival = require('./models/Arrival');
const { fn, col, where: sqlWhere } = require('sequelize');

async function testLiveDB() {
  try {
    // Simulate what locations.js does exactly
    const oldName = 'Sum25 Rnr2'; // Let's pretend the UI edited this
    const newName = 'Sum 25 RNR 2 TEST';
    
    console.log(`Simulating edit from "${oldName}" to "${newName}"`);
    
    const ArrivalCount = await Arrival.update(
      { variety: newName },
      {
        where: sqlWhere(
          fn('TRIM', fn('LOWER', col('variety'))),
          oldName.trim().toLowerCase()
        )
      }
    );
    console.log('Arrivals matched:', ArrivalCount[0]);

    const entryUpdated = await SampleEntry.update(
      { variety: newName },
      {
        where: sqlWhere(
          fn('TRIM', fn('LOWER', col('variety'))),
          oldName.trim().toLowerCase()
        )
      }
    );
    console.log('SampleEntries matched:', entryUpdated[0]);

    // Check count of 'Dec25 Rnr1'
    const entry2 = await SampleEntry.update(
      { variety: 'DEC 25 TEST' },
      {
        where: sqlWhere(
          fn('TRIM', fn('LOWER', col('variety'))),
          'dec25 rnr1'
        )
      }
    );
    console.log('SampleEntries matched for DEC25 RNR1:', entry2[0]);

    // Restore them back to how they were just in case they worked
    if (entryUpdated[0] > 0) {
      await SampleEntry.update({ variety: oldName }, { where: { variety: newName }});
    }
    if (entry2[0] > 0) {
      await SampleEntry.update({ variety: 'Dec25 Rnr1' }, { where: { variety: 'DEC 25 TEST' }});
    }

  } catch (err) {
    console.error('ERROR OCCURRED:', err);
  } finally {
    process.exit(0);
  }
}

testLiveDB();
