const { Sequelize } = require('sequelize');
const sequelize = require('./server/config/database');
const SampleEntryAuditLog = require('./server/models/SampleEntryAuditLog');

async function test() {
  const logs = await SampleEntryAuditLog.findAll({
    limit: 10,
    raw: true,
    attributes: ['id', 'newValues']
  });
  
  if (logs.length > 0) {
    const type = typeof logs[0].newValues;
    console.log('Type of newValues:', type);
    console.log('Value:', logs[0].newValues);
    if (type === 'string') {
      try {
         console.log('Parsed:', JSON.parse(logs[0].newValues));
      } catch (e) {
         console.log('Parse error', e);
      }
    }
  } else {
    console.log('No logs found');
  }
}

test().catch(console.error).finally(() => process.exit(0));
