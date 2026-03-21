const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const HamaliRatesService = require('../services/HamaliRatesService');

const router = express.Router();

// GET /api/hamali-rates - Get current hamali rates
router.get('/', auth, async (req, res) => {
  try {
    const rates = await HamaliRatesService.getCurrentRates();
    // Set cache headers for client-side caching
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json({ rates });
  } catch (error) {
    console.error('Get hamali rates error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch hamali rates' });
  }
});

// POST /api/hamali-rates - Create or update hamali rates (Manager/Admin only)
router.post('/', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { loadingRate, unloadingSadaRate, unloadingKnRate, looseTumbidduRate } = req.body;

    // Validate required fields
    if (loadingRate === undefined || unloadingSadaRate === undefined || 
        unloadingKnRate === undefined || looseTumbidduRate === undefined) {
      return res.status(400).json({ 
        error: 'All rate fields are required: loadingRate, unloadingSadaRate, unloadingKnRate, looseTumbidduRate' 
      });
    }

    const ratesData = {
      loadingRate: parseFloat(loadingRate),
      unloadingSadaRate: parseFloat(unloadingSadaRate),
      unloadingKnRate: parseFloat(unloadingKnRate),
      looseTumbidduRate: parseFloat(looseTumbidduRate)
    };

    const rates = await HamaliRatesService.saveRates(ratesData);
    
    res.json({
      message: 'Hamali rates saved successfully',
      rates
    });
  } catch (error) {
    console.error('Save hamali rates error:', error);
    
    if (error.message.includes('Validation failed')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to save hamali rates' });
  }
});

// PUT /api/hamali-rates/:id - Update specific hamali rate (Manager/Admin only)
router.put('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    // Only include fields that are provided
    if (req.body.loadingRate !== undefined) {
      updateData.loadingRate = parseFloat(req.body.loadingRate);
    }
    if (req.body.unloadingSadaRate !== undefined) {
      updateData.unloadingSadaRate = parseFloat(req.body.unloadingSadaRate);
    }
    if (req.body.unloadingKnRate !== undefined) {
      updateData.unloadingKnRate = parseFloat(req.body.unloadingKnRate);
    }
    if (req.body.looseTumbidduRate !== undefined) {
      updateData.looseTumbidduRate = parseFloat(req.body.looseTumbidduRate);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const rates = await HamaliRatesService.updateRate(parseInt(id), updateData);
    
    res.json({
      message: 'Hamali rate updated successfully',
      rates
    });
  } catch (error) {
    console.error('Update hamali rate error:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Validation failed')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Failed to update hamali rate' });
  }
});

module.exports = router;
