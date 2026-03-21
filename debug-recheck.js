
const path = require('path');
const { SampleEntry, QualityParameters, CookingReport } = require('./server/models');
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

    console.log('--- Diagnostic Report ---');
    if (entries.length === 0) {
      console.log('No entries found matching names.');
    }
    entries.forEach(e => {
      console.log(`ID: ${e.id} | Party: ${e.partyName} | Status: ${e.workflowStatus}`);
      console.log(`Quality exists: ${!!e.qualityParameters} | Cooking exists: ${!!e.cookingReport} | Cooking Status: ${e.cookingReport?.status}`);
      console.log('-------------------------');
    });
  } catch (err) {
    console.error('Error running diagnostic:', err.message);
  } finally {
    process.exit();
  }
}

debugEntries();
