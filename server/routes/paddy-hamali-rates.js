const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const PaddyHamaliRate = require('../models/PaddyHamaliRate');

const router = express.Router();

// GET all paddy hamali rates
router.get('/', auth, async (req, res) => {
  try {
    const rates = await PaddyHamaliRate.findAll({
      order: [['displayOrder', 'ASC']]
    });

    res.json({ rates });
  } catch (error) {
    console.error('Get paddy hamali rates error:', error);
    res.status(500).json({ error: 'Failed to fetch paddy hamali rates' });
  }
});

// UPDATE a paddy hamali rate (admin only)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { rate } = req.body;

    if (!rate || rate < 0) {
      return res.status(400).json({ error: 'Invalid rate value' });
    }

    const hamaliRate = await PaddyHamaliRate.findByPk(id);

    if (!hamaliRate) {
      return res.status(404).json({ error: 'Hamali rate not found' });
    }

    hamaliRate.rate = rate;
    await hamaliRate.save();

    res.json({ message: 'Rate updated successfully', rate: hamaliRate });
  } catch (error) {
    console.error('Update paddy hamali rate error:', error);
    res.status(500).json({ error: 'Failed to update paddy hamali rate' });
  }
});

module.exports = router;
