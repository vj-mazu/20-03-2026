const { sequelize } = require('./config/database');

async function fixDesync() {
  try {
    // 1. The user originally had 'Sum25 Rnr'
    // 2. They renamed it to 'DEC 24 RNR' in the Locations UI (we can see the code is still SUM25 RNR)
    // 3. I accidentally renamed the stranded entries to 'Sum25 Rnr2' earlier
    // Let's forcibly sync the 7 stranded records to what the user actually wanted:
    
    const [res] = await sequelize.query(`
      UPDATE sample_entries 
      SET variety = 'Dec 24 Rnr'
      WHERE variety = 'Sum25 Rnr2' OR LOWER(variety) = 'sum25 rnr2'
    `);
    
    console.log('Fixed desynced entries to Dec 24 Rnr!');

    // Also clean up that dummy 'NEW TEST VAR' we made
    await sequelize.query(`DELETE FROM varieties WHERE name = 'NEW TEST VAR'`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixDesync();
