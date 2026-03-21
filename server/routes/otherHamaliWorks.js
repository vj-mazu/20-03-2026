const express = require('express');
const router = express.Router();
const OtherHamaliWork = require('../models/OtherHamaliWork');
const { auth, authorize } = require('../middleware/auth');

// Simple in-memory cache
let worksCache = null;
let worksCacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get all other hamali work types
router.get('/', auth, async (req, res) => {
  try {
    // Check cache first
    if (worksCache && worksCacheTimestamp && (Date.now() - worksCacheTimestamp < CACHE_DURATION)) {
      return res.json({ works: worksCache });
    }

    const works = await OtherHamaliWork.findAll({
      where: { isActive: true },
      order: [['workType', 'ASC'], ['workDetail', 'ASC']]
    });

    // Cache the result
    worksCache = works;
    worksCacheTimestamp = Date.now();

    // Set cache headers for client-side caching
    res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    res.json({ works });
  } catch (error) {
    console.error('Error fetching other hamali works:', error);
    res.status(500).json({ error: 'Failed to fetch other hamali works' });
  }
});

// Create new other hamali work type (admin only)
router.post('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { workType, workDetail, rate, unit } = req.body;

    if (!workType || !workDetail || !rate) {
      return res.status(400).json({ error: 'Work type, detail, and rate are required' });
    }

    const work = await OtherHamaliWork.create({
      workType,
      workDetail,
      rate: parseFloat(rate),
      unit: unit || 'per_bag'
    });

    // Clear cache when creating new work
    worksCache = null;
    worksCacheTimestamp = null;

    res.status(201).json({ work });
  } catch (error) {
    console.error('Error creating other hamali work:', error);
    res.status(500).json({ error: 'Failed to create other hamali work' });
  }
});

// Update other hamali work type (admin only)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { workType, workDetail, rate, unit, isActive } = req.body;

    const work = await OtherHamaliWork.findByPk(id);
    if (!work) {
      return res.status(404).json({ error: 'Other hamali work not found' });
    }

    await work.update({
      workType: workType || work.workType,
      workDetail: workDetail || work.workDetail,
      rate: rate ? parseFloat(rate) : work.rate,
      unit: unit || work.unit,
      isActive: isActive !== undefined ? isActive : work.isActive
    });

    // Clear cache when updating work
    worksCache = null;
    worksCacheTimestamp = null;

    res.json({ work });
  } catch (error) {
    console.error('Error updating other hamali work:', error);
    res.status(500).json({ error: 'Failed to update other hamali work' });
  }
});

module.exports = router;