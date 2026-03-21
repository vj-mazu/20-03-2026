require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('./models/User');
const { sequelize } = require('./config/database');
const fs = require('fs');

async function testApi() {
  await sequelize.authenticate();
  let out = [];
  
  const user = await User.findOne({ where: { username: 'manjunath', isActive: true } });
  
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      staffType: user.staffType || null
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  out.push('Token: ' + user.username + ' role:' + user.role + ' type:' + user.staffType);

  try {
    const response = await axios.get('http://localhost:5000/api/sample-entries/by-role', {
      params: { page: 1, pageSize: 50, excludeEntryType: 'RICE_SAMPLE', status: 'LOCATION_SAMPLE', staffUsername: user.username, staffType: user.staffType },
      headers: { Authorization: `Bearer ${token}` }
    });

    const entries = response.data.entries;
    out.push('API returned ' + entries.length + ' entries!');
    entries.forEach((e, i) => {
      out.push((i+1) + '. c=' + e.sampleCollectedBy + ' o=' + e.sampleGivenToOffice + ' s=' + e.workflowStatus);
    });
    
  } catch (err) {
    out.push('API Error: ' + (err.response ? JSON.stringify(err.response.data) : err.message));
  }

  fs.writeFileSync('api_report.txt', out.join('\n'));
  console.log('Done reporting to api_report.txt');
  await sequelize.close();
}

testApi();
