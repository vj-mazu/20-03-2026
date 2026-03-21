const express = require('express');
const { Op } = require('sequelize');
const { auth, authorize } = require('../middleware/auth');
const Outturn = require('../models/Outturn');
const User = require('../models/User');
const Arrival = require('../models/Arrival');
const RiceProduction = require('../models/RiceProduction');

const router = express.Router();

// Get all outturns
router.get('/', auth, async (req, res) => {
  try {
    const { sequelize } = require('../config/database');
    const Arrival = require('../models/Arrival');

    // Optimized: Get outturns and latest paddy dates in one query using raw SQL
    // FIXED: Include 'purchase' type and add status filter for production environment
    const [outturns] = await sequelize.query(`
      SELECT 
        o.id,
        o.code,
        o."allottedVariety",
        o.type,
        o.is_cleared as "isCleared",
        o."createdAt",
        o."yield_percentage" as "yieldPercentage",
        u.username as "creatorUsername",
        MAX(a.date) as "paddyDate"
      FROM outturns o
      LEFT JOIN users u ON o."createdBy" = u.id
      LEFT JOIN arrivals a ON a."outturnId" = o.id 
        AND a."movementType" IN ('production-shifting', 'for-production', 'purchase')
        AND a.status = 'approved'
      GROUP BY o.id, o.code, o."allottedVariety", o.type, o.is_cleared, o."createdAt", o."yield_percentage", u.username
      ORDER BY o."createdAt" DESC
    `);

    // Cache headers for 2 minutes
    res.set('Cache-Control', 'public, max-age=120');
    res.json(outturns);
  } catch (error) {
    console.error('Error fetching outturns:', error);
    res.status(500).json({ error: 'Failed to fetch outturns' });
  }
});

// Create new outturn
router.post('/', auth, async (req, res) => {
  try {
    const { code, allottedVariety, type } = req.body;

    if (!code || !allottedVariety) {
      return res.status(400).json({ error: 'Code and allotted variety are required' });
    }

    // Validate type if provided
    if (type && !['Raw', 'Steam'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either Raw or Steam' });
    }

    // Check if code already exists
    const existing = await Outturn.findOne({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'Outturn code already exists' });
    }

    const outturn = await Outturn.create({
      code,
      allottedVariety,
      type: type || 'Raw', // Default to 'Raw' if not provided
      createdBy: req.user.userId
    });

    const created = await Outturn.findByPk(outturn.id, {
      include: [
        { model: User, as: 'creator', attributes: ['username'] }
      ]
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating outturn:', error);
    res.status(500).json({ error: 'Failed to create outturn' });
  }
});

// Update outturn (Manager/Admin only)
router.put('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { code, allottedVariety, type } = req.body;

    const outturn = await Outturn.findByPk(id);
    if (!outturn) {
      return res.status(404).json({ error: 'Outturn not found' });
    }

    // Check if code already exists (excluding current outturn)
    if (code && code !== outturn.code) {
      const existing = await Outturn.findOne({
        where: {
          code,
          id: { [Op.ne]: id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Outturn code already exists' });
      }
    }

    // Validate type if provided
    if (type && !['Raw', 'Steam'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either Raw or Steam' });
    }

    // If allottedVariety is changing, update related Arrivals to sync variety
    if (allottedVariety && allottedVariety !== outturn.allottedVariety) {
      await Arrival.update(
        { variety: allottedVariety.trim().toUpperCase() },
        {
          where: {
            outturnId: id,
            movementType: { [Op.in]: ['production-shifting', 'for-production'] }
          }
        }
      );
    }

    await outturn.update({
      code: code || outturn.code,
      allottedVariety: allottedVariety || outturn.allottedVariety,
      type: type || outturn.type
    });

    const updated = await Outturn.findByPk(outturn.id, {
      include: [
        { model: User, as: 'creator', attributes: ['username'] }
      ]
    });

    res.json({
      message: 'Outturn updated successfully',
      outturn: updated
    });
  } catch (error) {
    console.error('Error updating outturn:', error);
    res.status(500).json({ error: 'Failed to update outturn' });
  }
});

// Delete outturn
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const outturn = await Outturn.findByPk(id);
    if (!outturn) {
      return res.status(404).json({ error: 'Outturn not found' });
    }

    await outturn.destroy();
    res.json({ message: 'Outturn deleted successfully' });
  } catch (error) {
    console.error('Error deleting outturn:', error);
    res.status(500).json({ error: 'Failed to delete outturn' });
  }
});

// Clear outturn - Consume remaining bags and close outturn (Admin/Manager only)
router.post('/:id/clear', auth, authorize('admin', 'manager'), async (req, res) => {
  const { sequelize } = require('../config/database');
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { clearDate } = req.body; // Date when outturn is being cleared

    const outturn = await Outturn.findByPk(id);
    if (!outturn) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Outturn not found' });
    }

    // Check if already cleared
    if (outturn.isCleared) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Outturn already cleared' });
    }

    // ⚡ OPTIMIZED: Calculate total, used, and remaining bags in ONE query using CTE
    const [bagStats] = await sequelize.query(`
      WITH bag_totals AS (
        SELECT 
          COALESCE(SUM(a.bags), 0) as total_bags
        FROM arrivals a
        WHERE a."outturnId" = :outturnId
          AND a."movementType" IN ('production-shifting', 'purchase')
      ),
      bag_used AS (
        SELECT 
          COALESCE(SUM(rp."paddyBagsDeducted"), 0) as used_bags
        FROM rice_productions rp
        WHERE rp."outturnId" = :outturnId
          AND rp.status IN ('pending', 'approved')
      )
      SELECT 
        bt.total_bags,
        bu.used_bags,
        (bt.total_bags - bu.used_bags) as remaining_bags
      FROM bag_totals bt, bag_used bu
    `, {
      replacements: { outturnId: id },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    const { total_bags: totalPaddyBags, used_bags: usedBags, remaining_bags: remainingBags } = bagStats;

    console.log('🔍 Clear Outturn - Total:', totalPaddyBags, 'Used:', usedBags, 'Remaining:', remainingBags);

    if (remainingBags <= 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No remaining bags to clear' });
    }

    // Validate clearDate
    if (!clearDate) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Clear date is required' });
    }

    // Create a RiceProduction entry to consume the remaining bags
    // This will show in "Working" section and properly close the outturn
    // Product type: "Outturn Clearing" to indicate this is a clearing entry
    await RiceProduction.create({
      outturnId: id,
      date: clearDate,
      productType: 'Bran', // Use Bran as it doesn't deduct bags (waste/loss)
      quantityQuintals: remainingBags / 3, // Convert paddy bags to quintals (1 quintal = 3 bags)
      packagingId: 1, // Dummy packaging (will be ignored for Bran)
      bags: 0, // No output bags (waste/loss) - paddyBagsDeducted handles the consumption
      paddyBagsDeducted: remainingBags, // Consume all remaining bags (this is what matters!)
      movementType: 'kunchinittu',
      locationCode: 'CLEARING', // Special location code for clearing
      status: 'approved', // Auto-approve clearing entries
      createdBy: req.user.userId,
      approvedBy: req.user.userId,
      approvedAt: new Date()
    }, { transaction });

    // Mark outturn as cleared
    await outturn.update({
      isCleared: true,
      clearedAt: new Date(),
      clearedBy: req.user.userId,
      remainingBags: remainingBags
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Outturn ${outturn.code} cleared successfully`);
    console.log(`📊 ${remainingBags} bags consumed on ${clearDate}`);

    res.json({
      success: true,
      message: `Outturn cleared! ${remainingBags} bags consumed and added to working section on ${clearDate}.`,
      remainingBags,
      clearDate
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error clearing outturn:', error);
    res.status(500).json({ error: 'Failed to clear outturn', details: error.message });
  }
});

module.exports = router;
