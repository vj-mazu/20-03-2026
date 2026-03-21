const axios = require('axios');
const jwt = require('jsonwebtoken');

// Generate an admin token for Mother India app
const token = jwt.sign({ id: 1, role: 'admin' }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' }); 
// Note: might fail if JWT_SECRET is different, but I'll try to find it in .env if it fails

async function testCascade() {
  try {
    // 1. Get current varieties
    const { data: { varieties } } = await axios.get('http://localhost:5000/api/locations/varieties', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Current Varieties:', varieties.map(v => v.name));

    // Let's create a new variety "TEST VAR"
    const createRes = await axios.post('http://localhost:5000/api/locations/varieties', {
      name: 'TEST VAR',
      code: 'TEST VAR'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const newVariety = createRes.data.variety;
    console.log('Created Variety:', newVariety.name);

    // Create a dummy sample entry using DB directly since we might not know all fields required by API
    const { sequelize } = require('./config/database');
    const SampleEntry = require('./models/SampleEntry');
    const entry = await SampleEntry.create({
      entryType: 'inwards',
      commodity: 'paddy',
      type: 'location',
      partyName: 'Test Party',
      brokerName: 'Test Broker',
      variety: 'Test Var',
      bags: 100,
      bagsType: 'sada',
      qty: 50,
      status: 'pending',
      lorryNumber: 'KA01AB1234',
      vehicleType: 'lorry',
      location: 'Test Loc',
      createdBy: 1
    });
    console.log('Created dummy sample entry with variety:', entry.variety);

    // NOW, update the variety via API (like the user does)
    console.log('Calling PUT api/locations/varieties/' + newVariety.id + ' to rename to TEST VAR EDITED');
    await axios.put(`http://localhost:5000/api/locations/varieties/${newVariety.id}`, {
      name: 'TEST VAR EDITED',
      code: 'TEST VAR EDITED'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    // Check if sample entry was updated
    const updatedEntry = await SampleEntry.findByPk(entry.id);
    console.log('Sample entry variety is now:', updatedEntry.variety);

    // Clean up
    await entry.destroy();
    await axios.delete(`http://localhost:5000/api/locations/varieties/${newVariety.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Cleaned up');

  } catch (error) {
    console.error('API Error:', error.response?.data || error.message);
  } finally {
    process.exit(0);
  }
}

testCascade();
