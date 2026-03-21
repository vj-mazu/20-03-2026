const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const HamaliEntriesService = require('../services/HamaliEntriesService');
const cacheService = require('../services/cacheService');

const router = express.Router();

// GET /api/hamali-entries - Get all hamali entries with filters
router.get('/', auth, async (req, res) => {
  try {
    const filters = {
      date: req.query.date,
      fromDate: req.query.fromDate,
      toDate: req.query.toDate,
      createdBy: req.query.createdBy ? parseInt(req.query.createdBy) : undefined,
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const entries = await HamaliEntriesService.getEntries(filters);
    res.json({ entries });
  } catch (error) {
    console.error('Get hamali entries error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch hamali entries' });
  }
});

// GET /api/hamali-entries/:id - Get specific hamali entry
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await HamaliEntriesService.getEntryById(parseInt(id));
    res.json({ entry });
  } catch (error) {
    console.error('Get hamali entry error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to fetch hamali entry' });
  }
});

// GET /api/hamali-entries/arrival/:arrivalId - Get hamali for specific arrival
router.get('/arrival/:arrivalId', auth, async (req, res) => {
  try {
    const { arrivalId } = req.params;
    const entry = await HamaliEntriesService.getEntryByArrivalId(parseInt(arrivalId));
    res.json({ entry });
  } catch (error) {
    console.error('Get hamali entry by arrival error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch hamali entry' });
  }
});

// POST /api/hamali-entries/batch - Get hamali entries for multiple arrivals (CACHED)
router.post('/batch', auth, async (req, res) => {
  try {
    const { arrivalIds } = req.body;

    if (!Array.isArray(arrivalIds)) {
      return res.status(400).json({ error: 'arrivalIds must be an array' });
    }

    // SAFE CACHING: Create cache key based on sorted IDs
    const sortedIds = [...arrivalIds].sort((a, b) => a - b);
    const cacheKey = `hamali-batch:${sortedIds.join(',')}`;

    // Try cache first (safe - won't crash on error)
    try {
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        return res.json({ entries: cachedData, fromCache: true });
      }
    } catch (cacheError) {
      console.warn('Hamali batch cache read failed (safe):', cacheError.message);
    }

    const entries = await HamaliEntriesService.getEntriesByArrivalIds(arrivalIds);

    // SAFE CACHE SET (won't crash on error)
    try {
      await cacheService.set(cacheKey, entries, 60); // 60 second cache for performance
    } catch (cacheError) {
      console.warn('Hamali batch cache write failed (safe):', cacheError.message);
    }

    res.json({ entries });
  } catch (error) {
    console.error('Batch get hamali entries error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch hamali entries' });
  }
});

// POST /api/hamali-entries - Create new hamali entry
router.post('/', auth, async (req, res) => {
  try {
    const {
      arrivalId,
      hasLoadingHamali,
      hasUnloadingHamali,
      unloadingType,
      hasLooseTumbiddu,
      looseBags
    } = req.body;

    // Validate required fields
    if (!arrivalId) {
      return res.status(400).json({ error: 'Arrival ID is required' });
    }

    const entryData = {
      arrivalId: parseInt(arrivalId),
      hasLoadingHamali: hasLoadingHamali || false,
      hasUnloadingHamali: hasUnloadingHamali || false,
      unloadingType: unloadingType || null,
      hasLooseTumbiddu: hasLooseTumbiddu || false,
      looseBags: looseBags ? parseInt(looseBags) : null
    };

    const entry = await HamaliEntriesService.createEntry(entryData, req.user.userId, req.user.role);

    res.status(201).json({
      message: 'Hamali entry created successfully',
      entry
    });
  } catch (error) {
    console.error('Create hamali entry error:', error);

    if (error.message.includes('Validation failed') ||
      error.message.includes('already exists') ||
      error.message.includes('not found')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to create hamali entry' });
  }
});

// PUT /api/hamali-entries/:id - Update hamali entry
router.put('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};

    // Only include fields that are provided
    if (req.body.hasLoadingHamali !== undefined) {
      updateData.hasLoadingHamali = req.body.hasLoadingHamali;
    }
    if (req.body.hasUnloadingHamali !== undefined) {
      updateData.hasUnloadingHamali = req.body.hasUnloadingHamali;
    }
    if (req.body.unloadingType !== undefined) {
      updateData.unloadingType = req.body.unloadingType;
    }
    if (req.body.hasLooseTumbiddu !== undefined) {
      updateData.hasLooseTumbiddu = req.body.hasLooseTumbiddu;
    }
    if (req.body.looseBags !== undefined) {
      updateData.looseBags = parseInt(req.body.looseBags);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const entry = await HamaliEntriesService.updateEntry(parseInt(id), updateData, req.user.userId);

    res.json({
      message: 'Hamali entry updated successfully',
      entry
    });
  } catch (error) {
    console.error('Update hamali entry error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('Validation failed')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to update hamali entry' });
  }
});

// POST /api/hamali-entries/:id/approve - Approve hamali entry (Manager/Admin only)
router.post('/:id/approve', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await HamaliEntriesService.approveEntry(parseInt(id), req.user.userId);

    res.json({
      message: 'Hamali entry approved successfully',
      entry
    });
  } catch (error) {
    console.error('Approve hamali entry error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes('already approved')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to approve hamali entry' });
  }
});

// DELETE /api/hamali-entries/:id - Delete hamali entry
router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    await HamaliEntriesService.deleteEntry(parseInt(id));

    res.json({ message: 'Hamali entry deleted successfully' });
  } catch (error) {
    console.error('Delete hamali entry error:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message || 'Failed to delete hamali entry' });
  }
});

// GET /api/hamali-entries/summary/:date - Get daily summary
router.get('/summary/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const summary = await HamaliEntriesService.getDailySummary(date);
    res.json({ summary });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate daily summary' });
  }
});

module.exports = router;
