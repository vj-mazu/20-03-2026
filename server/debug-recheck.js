
const { SampleEntry, QualityParameters, CookingReport } = require('./models');
const { Op } = require('sequelize');

async function debugEntries() {
  try {
    const entries = await SampleEntry.findAll({
      where: {
        partyName: {
          [Op.in]: ['Mallu', 'Manjunath', 'KA33EF3434']
        }
      },
      include: [
        { model: QualityParameters, as: 'qualityParameters' },
        { model: CookingReport, as: 'cookingReport' }
      ]
    });

    console.log('--- Detailed Diagnostic Report ---');
    if (entries.length === 0) {
      console.log('No entries found matching names.');
    }
    entries.forEach(e => {
      console.log(`ID: ${e.id}`);
      console.log(`Party: ${e.partyName}`);
      console.log(`Status: ${e.workflowStatus}`);
      console.log(`Decision: ${e.lotSelectionDecision}`);
      console.log(`Recheck Requested: ${e.recheckRequested}`);
      console.log(`Recheck Type: ${e.recheckType}`);
      console.log(`Quality exists: ${!!e.qualityParameters}`);
      console.log(`Cooking exists: ${!!e.cookingReport}`);
      if (e.cookingReport) {
        console.log(`Cooking Status: ${e.cookingReport.status}`);
      }
      console.log('-------------------------');
    });
  } catch (err) {
    console.error('Error running diagnostic:', err.message);
    console.error(err.stack);
  } finally {
    process.exit();
  }
}

debugEntries();
