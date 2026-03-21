const axios = require('axios');
const jwt = require('jsonwebtoken');

// Generate an admin token
const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1h' });

async function testApi() {
  try {
    // 1. Get varieties to find ID of Sum25 Rnr2
    console.log('Fetching varieties...');
    const result = await axios.get('http://localhost:5000/api/locations/varieties', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const variety = result.data.varieties.find(v => v.name === 'SUM25 RNR2' || v.name === 'Sum25 Rnr2');
    if (!variety) {
      console.log('Variety not found. Available:', result.data.varieties.map(v => v.name));
      return;
    }
    
    console.log(`Found variety ${variety.id}: ${variety.name}. Renaming to Sum25 Rnr3...`);
    
    // 2. Put request to rename it
    const putResult = await axios.put(`http://localhost:5000/api/locations/varieties/${variety.id}`, {
      name: 'SUM25 RNR3',
      code: 'SUM25 RNR3',
      description: variety.description
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('API Response:', putResult.data.message);
    
    // 3. See if sample entries updated
    const { sequelize } = require('./config/database');
    const [[{ count }]] = await sequelize.query(`SELECT COUNT(*) as count FROM sample_entries WHERE variety = 'SUM25 RNR3'`);
    console.log(`Sample entries with SUM25 RNR3: ${count}`);
    
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    process.exit(0);
  }
}

testApi();
