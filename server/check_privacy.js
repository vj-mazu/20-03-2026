require('dotenv').config();
var fs = require('fs');
var { sequelize } = require('./config/database');
var SampleEntry = require('./models/SampleEntry');
var { Op } = require('sequelize');

async function go() {
  await sequelize.authenticate();
  var out = [];

  // Test for Maruthi (userId=4, username=maruthi)
  var r1 = await SampleEntry.findAll({
    where: {
      [Op.and]: [
        {
          [Op.and]: [
            { [Op.or]: [{ workflowStatus: 'STAFF_ENTRY' }, { lotSelectionDecision: 'FAIL' }] },
            { workflowStatus: { [Op.ne]: 'FAILED' } },
            { entryType: 'LOCATION_SAMPLE' }
          ]
        },
        {
          [Op.or]: [
            { entryType: { [Op.ne]: 'LOCATION_SAMPLE' } },
            { createdByUserId: 4 },
            { sampleCollectedBy: { [Op.iLike]: '%maruthi%' } },
            { sampleGivenToOffice: true },
            { workflowStatus: { [Op.ne]: 'STAFF_ENTRY' } }
          ]
        }
      ]
    },
    attributes: ['id', 'sampleCollectedBy', 'sampleGivenToOffice', 'workflowStatus', 'createdByUserId'],
    raw: true
  });

  out.push('MARUTHI(id=4) sees ' + r1.length + ':');
  r1.forEach(function(r) { out.push('  c=' + r.sampleCollectedBy + ' o=' + r.sampleGivenToOffice + ' s=' + r.workflowStatus + ' u=' + r.createdByUserId); });

  // Test for Manjunath (userId=2, username=manjunath)
  var r2 = await SampleEntry.findAll({
    where: {
      [Op.and]: [
        {
          [Op.and]: [
            { [Op.or]: [{ workflowStatus: 'STAFF_ENTRY' }, { lotSelectionDecision: 'FAIL' }] },
            { workflowStatus: { [Op.ne]: 'FAILED' } },
            { entryType: 'LOCATION_SAMPLE' }
          ]
        },
        {
          [Op.or]: [
            { entryType: { [Op.ne]: 'LOCATION_SAMPLE' } },
            { createdByUserId: 2 },
            { sampleCollectedBy: { [Op.iLike]: '%manjunath%' } },
            { sampleGivenToOffice: true },
            { workflowStatus: { [Op.ne]: 'STAFF_ENTRY' } }
          ]
        }
      ]
    },
    attributes: ['id', 'sampleCollectedBy', 'sampleGivenToOffice', 'workflowStatus', 'createdByUserId'],
    raw: true
  });

  out.push('MANJUNATH(id=2) sees ' + r2.length + ':');
  r2.forEach(function(r) { out.push('  c=' + r.sampleCollectedBy + ' o=' + r.sampleGivenToOffice + ' s=' + r.workflowStatus + ' u=' + r.createdByUserId); });

  // Also test WITHOUT privacy clause to see all entries
  var r3 = await SampleEntry.findAll({
    where: {
      [Op.and]: [
        { [Op.or]: [{ workflowStatus: 'STAFF_ENTRY' }, { lotSelectionDecision: 'FAIL' }] },
        { workflowStatus: { [Op.ne]: 'FAILED' } },
        { entryType: 'LOCATION_SAMPLE' }
      ]
    },
    attributes: ['id', 'sampleCollectedBy', 'sampleGivenToOffice', 'workflowStatus', 'createdByUserId'],
    raw: true
  });

  out.push('ALL(no filter) sees ' + r3.length + ':');
  r3.forEach(function(r) { out.push('  c=' + r.sampleCollectedBy + ' o=' + r.sampleGivenToOffice + ' s=' + r.workflowStatus + ' u=' + r.createdByUserId); });

  fs.writeFileSync('privacy_report.txt', out.join('\n'));
  console.log('Done - see privacy_report.txt');
  await sequelize.close();
}

go().catch(function(e) { console.error(e.message); process.exit(1); });
