const { sequelize } = require('./config/database');
const SampleEntry = require('./models/SampleEntry');
const Variety = require('./models/Location').Variety;
const Arrival = require('./models/Arrival');
const { fn, col, where: sqlWhere } = require('sequelize');

const toTitleCase = (str) => {
  if (!str) return str;
  return str.toLowerCase().replace(/(?:^|\s)\S/g, c => c.toUpperCase());
};

async function testCascadeFlow() {
  try {
    // 1. Create a Variety
    const variety = await Variety.create({
      name: 'NEW TEST VAR',
      code: 'NEW TEST VAR'
    });
    console.log('Created Variety:', variety.name);

    // 2. Create a Sample Entry that uses the Title Case version of this name (like the UI does)
    const entry = await SampleEntry.create({
      entryType: 'inwards',
      commodity: 'paddy',
      type: 'location',
      partyName: 'Test P',
      brokerName: 'Test B',
      variety: 'New Test Var', // UI creates in Title Case
      bags: 10, bagsType: 'sada', qty: 10, status: 'pending',
      lorryNumber: '123', vehicleType: 'lorry', location: 'L', createdBy: 1
    });
    console.log('Created SampleEntry with variety:', entry.variety);

    // 3. User edits the Variety -> they change it to 'EDITED TEST VAR'
    const oldName = variety.name; // 'NEW TEST VAR'
    const name = 'EDITED TEST VAR';
    const normalizedName = name.trim().toUpperCase();
    
    await variety.update({ name: normalizedName, code: normalizedName });
    console.log('Updated Variety to:', variety.name);

    if (normalizedName !== oldName.trim().toUpperCase()) {
      const titleCaseVariety = toTitleCase(name.trim()); // 'Edited Test Var'
      
      const updatedCount = await Arrival.update(
        { variety: titleCaseVariety },
        { where: { variety: oldName.trim().toUpperCase() } }
      );
      console.log(`Arrivals updated: ${updatedCount[0]} (Old: ${oldName.trim().toUpperCase()})`);

      const entryUpdated = await SampleEntry.update(
        { variety: titleCaseVariety },
        {
          where: sqlWhere(
            fn('LOWER', col('variety')),
            oldName.trim().toLowerCase()
          )
        }
      );
      console.log(`SampleEntries updated: ${entryUpdated[0]} (Old: ${oldName.trim().toLowerCase()})`);
    }

    // 4. Verify
    const verifyEntry = await SampleEntry.findByPk(entry.id);
    console.log('Verified SampleEntry variety:', verifyEntry.variety);

    // Clean up
    await entry.destroy();
    await variety.destroy();
    console.log('Cleaned up');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

testCascadeFlow();
