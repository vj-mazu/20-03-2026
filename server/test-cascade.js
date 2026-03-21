const { sequelize } = require('./config/database');
const SampleEntry = require('./models/SampleEntry');
const Arrival = require('./models/Arrival');
const { fn, col, where: sqlWhere } = require('sequelize');

async function testCascade() {
  try {
    const oldName = 'Sum25 Rnr';
    const normalizedVariety = 'SUM25 RNR2';

    console.log('Testing Arrival update...');
    const updatedCount = await Arrival.update(
      { variety: normalizedVariety },
      {
        where: {
          variety: oldName.trim().toUpperCase()
        }
      }
    );
    console.log('Arrivals updated:', updatedCount[0]);

    console.log('Testing SampleEntry update...');
    const entryUpdated = await SampleEntry.update(
      { variety: normalizedVariety },
      {
        where: sqlWhere(
          fn('LOWER', col('variety')),
          oldName.trim().toLowerCase()
        )
      }
    );
    console.log('SampleEntries updated:', entryUpdated[0]);

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    process.exit(0);
  }
}

testCascade();
