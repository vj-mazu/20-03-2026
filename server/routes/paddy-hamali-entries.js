const express = require('express');
const { Op } = require('sequelize');  // ✅ Added: Import Op for query operators
const { auth, authorize } = require('../middleware/auth');
const PaddyHamaliEntry = require('../models/PaddyHamaliEntry');
const Arrival = require('../models/Arrival');
const User = require('../models/User');
const Outturn = require('../models/Outturn');

const router = express.Router();

// Get pending paddy hamali entries for approval (managers/admins only)
router.get('/pending-list', auth, async (req, res) => {
  try {
    // Only managers and admins can view pending list
    if (req.user.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Manager or Admin role required.' });
    }

    const entries = await PaddyHamaliEntry.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: Arrival,
          as: 'arrival',
          attributes: ['id', 'slNo', 'broker', 'date', 'bags', 'variety', 'movementType']
        },
        { model: User, as: 'addedByUser', attributes: ['id', 'username', 'role'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 500
    });

    res.json({ entries });
  } catch (error) {
    console.error('Get pending paddy hamali entries error:', error);
    res.status(500).json({ error: 'Failed to fetch pending paddy hamali entries' });
  }
});

// Bulk approve paddy hamali entries
router.post('/bulk-approve', auth, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Manager or Admin role required.' });
    }

    const { entryIds } = req.body;
    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({ error: 'Entry IDs are required' });
    }

    await PaddyHamaliEntry.update(
      {
        status: 'approved',
        approvedBy: req.user.userId,
        approvedAt: new Date()
      },
      { where: { id: entryIds, status: 'pending' } }
    );

    res.json({ message: `${entryIds.length} paddy hamali entry/entries approved successfully` });
  } catch (error) {
    console.error('Bulk approve paddy hamali entries error:', error);
    res.status(500).json({ error: 'Failed to approve paddy hamali entries' });
  }
});

// Bulk reject paddy hamali entries
router.post('/bulk-reject', auth, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Manager or Admin role required.' });
    }

    const { entryIds, remarks } = req.body;
    if (!entryIds || !Array.isArray(entryIds) || entryIds.length === 0) {
      return res.status(400).json({ error: 'Entry IDs are required' });
    }

    await PaddyHamaliEntry.update(
      {
        status: 'rejected',
        rejectionRemarks: remarks || null,
        rejectedBy: req.user.userId,
        rejectedAt: new Date()
      },
      { where: { id: entryIds, status: 'pending' } }
    );

    res.json({ message: `${entryIds.length} paddy hamali entry/entries rejected` });
  } catch (error) {
    console.error('Bulk reject paddy hamali entries error:', error);
    res.status(500).json({ error: 'Failed to reject paddy hamali entries' });
  }
});

// GET hamali entries by arrival IDs (batch) - MISSING ENDPOINT
router.post('/batch', auth, async (req, res) => {
  try {
    const { arrivalIds } = req.body;

    if (!arrivalIds || !Array.isArray(arrivalIds) || arrivalIds.length === 0) {
      return res.json({ entries: {} });
    }

    // Fetch all paddy hamali entries for the given arrival IDs
    const entries = await PaddyHamaliEntry.findAll({
      where: {
        arrivalId: { [Op.in]: arrivalIds },
        status: 'approved' // Only show approved entries
      },
      include: [
        { model: User, as: 'addedByUser', attributes: ['id', 'username', 'role'] },
        { model: User, as: 'approvedByUser', attributes: ['id', 'username', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Group entries by arrival ID
    const groupedEntries = {};
    entries.forEach(entry => {
      const arrivalId = entry.arrivalId;
      if (!groupedEntries[arrivalId]) {
        groupedEntries[arrivalId] = {
          hasLoadingHamali: false,
          hasUnloadingHamali: false,
          hasLooseTumbiddu: false,
          loadingTotal: 0,
          unloadingTotal: 0,
          looseTotal: 0,
          grandTotal: 0,
          status: 'approved',
          entries: []
        };
      }

      // Categorize by work type
      if (entry.workType === 'Loading') {
        groupedEntries[arrivalId].hasLoadingHamali = true;
        groupedEntries[arrivalId].loadingTotal += entry.amount;
      } else if (entry.workType === 'Unloading') {
        groupedEntries[arrivalId].hasUnloadingHamali = true;
        groupedEntries[arrivalId].unloadingTotal += entry.amount;
      } else if (entry.workType === 'Loose Tumbiddu') {
        groupedEntries[arrivalId].hasLooseTumbiddu = true;
        groupedEntries[arrivalId].looseTotal += entry.amount;
      }

      groupedEntries[arrivalId].grandTotal += entry.amount;
      groupedEntries[arrivalId].entries.push(entry);
    });

    res.json({ entries: groupedEntries });
  } catch (error) {
    console.error('Error fetching paddy hamali entries batch:', error);
    res.status(500).json({ error: 'Failed to fetch hamali entries' });
  }
});

// CREATE bulk paddy hamali entries
router.post('/bulk', auth, async (req, res) => {
  const { sequelize } = require('../config/database');

  try {
    const { arrivalId, entries } = req.body;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    const userRole = req.user.role;

    // Validate input
    if (!arrivalId) {
      return res.status(400).json({ error: 'Arrival ID is required' });
    }

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'At least one hamali type must be selected' });
    }

    // Check if arrival exists
    const arrival = await Arrival.findByPk(arrivalId);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }

    // Allow all hamali types to be selected together - no restrictions

    // Validate each entry
    for (const entry of entries) {
      if (!entry.workType || !entry.workDetail || !entry.rate || !entry.bags) {
        return res.status(400).json({ error: 'All fields are required for each entry' });
      }

      if (entry.bags < 1) {
        return res.status(400).json({ error: 'Bags must be at least 1 for each entry' });
      }
    }

    // Determine status based on user role
    const status = (userRole === 'manager' || userRole === 'admin') ? 'approved' : 'pending';
    const approvedBy = (status === 'approved') ? userId : null;
    const approvedAt = (status === 'approved') ? new Date() : null;

    // Create entries in transaction
    const transaction = await sequelize.transaction();

    try {
      const createdEntries = [];

      for (const entry of entries) {
        // Calculate amount
        const amount = parseFloat(entry.rate) * parseInt(entry.bags);

        // Check if entry already exists for this arrival, work type, work detail, and worker
        const existingEntry = await PaddyHamaliEntry.findOne({
          where: {
            arrivalId,
            workType: entry.workType,
            workDetail: entry.workDetail,
            workerName: entry.workerName || null,
            addedBy: userId
          },
          transaction
        });

        let hamaliEntry;

        if (existingEntry) {
          // Update existing entry instead of creating new one
          await existingEntry.update({
            rate: entry.rate,
            bags: entry.bags,
            amount,
            batchNumber: entry.batchNumber || existingEntry.batchNumber,
            status,
            approvedBy,
            approvedAt
          }, { transaction });
          hamaliEntry = existingEntry;
        } else {
          // Create new entry
          hamaliEntry = await PaddyHamaliEntry.create({
            arrivalId,
            workType: entry.workType,
            workDetail: entry.workDetail,
            rate: entry.rate,
            bags: entry.bags,
            amount,
            workerName: entry.workerName || null,
            batchNumber: entry.batchNumber || null,
            status,
            addedBy: userId,
            approvedBy,
            approvedAt
          }, { transaction });
        }

        createdEntries.push(hamaliEntry);
      }

      await transaction.commit();

      res.status(201).json({
        message: 'Hamali entries created successfully',
        entries: createdEntries,
        autoApproved: status === 'approved'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Create bulk hamali entries error:', error);
    res.status(500).json({
      error: 'Failed to create hamali entries',
      details: error.message
    });
  }
});

// CREATE paddy hamali entry (single)
router.post('/', auth, async (req, res) => {
  try {
    const { arrivalId, workType, workDetail, rate, bags } = req.body;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    const userRole = req.user.role;

    // Validate input
    if (!arrivalId || !workType || !workDetail || !rate || !bags) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (bags < 1) {
      return res.status(400).json({ error: 'Bags must be at least 1' });
    }

    // Check if arrival exists
    const arrival = await Arrival.findByPk(arrivalId);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }

    // Calculate amount
    const amount = parseFloat(rate) * parseInt(bags);

    // Determine status based on user role
    const status = (userRole === 'manager' || userRole === 'admin') ? 'approved' : 'pending';
    const approvedBy = (status === 'approved') ? userId : null;
    const approvedAt = (status === 'approved') ? new Date() : null;

    // Create entry
    const entry = await PaddyHamaliEntry.create({
      arrivalId,
      workType,
      workDetail,
      rate,
      bags,
      amount,
      status,
      addedBy: userId,
      approvedBy,
      approvedAt
    });

    res.status(201).json({
      message: 'Hamali entry created successfully',
      entry,
      autoApproved: status === 'approved'
    });
  } catch (error) {
    console.error('Create paddy hamali entry error:', error);
    res.status(500).json({ error: 'Failed to create hamali entry' });
  }
});

// GET hamali entries for an arrival
router.get('/arrival/:arrivalId', auth, async (req, res) => {
  try {
    const { arrivalId } = req.params;

    const entries = await PaddyHamaliEntry.findAll({
      where: { arrivalId },
      include: [
        { model: User, as: 'addedByUser', attributes: ['id', 'username', 'role'] },
        { model: User, as: 'approvedByUser', attributes: ['id', 'username', 'role'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const total = entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    res.json({ entries, total });
  } catch (error) {
    console.error('Get hamali entries error:', error);
    res.status(500).json({ error: 'Failed to fetch hamali entries' });
  }
});

// UPDATE hamali entry
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { workType, workDetail, rate, bags } = req.body;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    const userRole = req.user.role;

    const entry = await PaddyHamaliEntry.findByPk(id);

    if (!entry) {
      return res.status(404).json({ error: 'Hamali entry not found' });
    }

    // Check permissions
    if (entry.status === 'approved' && userRole === 'staff') {
      return res.status(403).json({ error: 'Cannot edit approved hamali entry' });
    }

    if (entry.status === 'pending' && entry.addedBy !== userId && userRole === 'staff') {
      return res.status(403).json({ error: 'You can only edit your own entries' });
    }

    // Update entry
    entry.workType = workType;
    entry.workDetail = workDetail;
    entry.rate = rate;
    entry.bags = bags;
    entry.amount = parseFloat(rate) * parseInt(bags);

    await entry.save();

    res.json({ message: 'Hamali entry updated successfully', entry });
  } catch (error) {
    console.error('Update hamali entry error:', error);
    res.status(500).json({ error: 'Failed to update hamali entry' });
  }
});

// APPROVE hamali entry
router.put('/:id/approve', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token

    const entry = await PaddyHamaliEntry.findByPk(id);

    if (!entry) {
      return res.status(404).json({ error: 'Hamali entry not found' });
    }

    if (entry.status === 'approved') {
      return res.status(400).json({ error: 'Entry is already approved' });
    }

    entry.status = 'approved';
    entry.approvedBy = userId;
    entry.approvedAt = new Date();

    await entry.save();

    res.json({ message: 'Hamali entry approved successfully', entry });
  } catch (error) {
    console.error('Approve hamali entry error:', error);
    res.status(500).json({ error: 'Failed to approve hamali entry' });
  }
});

// GET hamali book (approved entries only)  
// Note: Authorization temporarily disabled - all authenticated users can access
router.get('/book', auth, async (req, res) => {
  try {
    const { dateFrom, dateTo, workType, page = 1, limit = 500 } = req.query;
    const offset = (Number.parseInt(page) - 1) * Number.parseInt(limit);
    const limitVal = Number.parseInt(limit);

    console.log('📖 Hamali Book Request:', {
      dateFrom,
      dateTo,
      workType,
      page,
      limit
    });

    const where = { status: 'approved' };

    // Apply work type filter
    if (workType) {
      where.workType = workType;
    }

    // Build include array
    const include = [
      {
        model: Arrival,
        as: 'arrival',
        attributes: ['id', 'slNo', 'broker', 'date', 'bags', 'variety', 'movementType'],
        include: [
          {
            model: Outturn,
            as: 'outturn',
            attributes: ['code'],
            required: false
          },
          {
            model: require('../models/Location').Kunchinittu,
            as: 'toKunchinittu',
            attributes: ['name', 'code'],
            include: [
              {
                model: require('../models/Location').Warehouse,
                as: 'warehouse',
                attributes: ['name'],
                required: false
              }
            ],
            required: false
          },
          {
            model: require('../models/Location').Warehouse,
            as: 'toWarehouse',
            attributes: ['name', 'code'],
            required: false
          },
          {
            model: require('../models/Location').Kunchinittu,
            as: 'fromKunchinittu',
            attributes: ['name', 'code'],
            include: [
              {
                model: require('../models/Location').Warehouse,
                as: 'warehouse',
                attributes: ['name'],
                required: false
              }
            ],
            required: false
          },
          {
            model: require('../models/Location').Warehouse,
            as: 'fromWarehouse',
            attributes: ['name', 'code'],
            required: false
          },
          {
            model: require('../models/Location').Warehouse,
            as: 'toWarehouseShift',
            attributes: ['name', 'code'],
            required: false
          }
        ],
        required: false  // LEFT JOIN - include entries even without arrival
      },
      {
        model: User,
        as: 'addedByUser',
        attributes: ['id', 'username'],
        required: false
      },
      {
        model: User,
        as: 'approvedByUser',
        attributes: ['id', 'username'],
        required: false
      }
    ];

    // Apply date filters on arrival date if provided
    if (dateFrom || dateTo) {
      const dateWhere = {};
      if (dateFrom) {
        dateWhere[Op.gte] = dateFrom;
      }
      if (dateTo) {
        dateWhere[Op.lte] = dateTo;
      }
      include[0].where = { date: dateWhere };
      include[0].required = true;  // INNER JOIN when filtering by date
    }

    const entries = await PaddyHamaliEntry.findAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit: limitVal,
      offset: offset
    });

    console.log(`✅ Found ${entries.length} hamali entries`);

    const total = entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    res.json({ entries, total });
  } catch (error) {
    console.error('❌ Get hamali book error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch hamali book',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET summary for hamali book (by date) - OPTIMIZED
router.get('/summary/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const startTime = Date.now();

    // Set up the association here to ensure it's available
    const Arrival = require('../models/Arrival');

    // Only set up association if it doesn't already exist
    if (!PaddyHamaliEntry.associations.arrival) {
      PaddyHamaliEntry.belongsTo(Arrival, { foreignKey: 'arrivalId', as: 'arrival' });
    }

    // OPTIMIZED: Reduced includes, only essential data
    const entries = await PaddyHamaliEntry.findAll({
      where: {
        status: 'approved'
      },
      include: [
        {
          model: Arrival,
          as: 'arrival',
          where: {
            date: date
          },
          attributes: ['id', 'slNo', 'broker', 'date', 'bags', 'variety', 'movementType'],
          include: [
            {
              model: require('../models/Location').Kunchinittu,
              as: 'toKunchinittu',
              attributes: ['name', 'code'],
              required: false
            },
            {
              model: require('../models/Location').Warehouse,
              as: 'toWarehouse',
              attributes: ['name', 'code'],
              required: false
            },
            {
              model: require('../models/Location').Kunchinittu,
              as: 'fromKunchinittu',
              attributes: ['name', 'code'],
              required: false
            },
            {
              model: require('../models/Location').Warehouse,
              as: 'fromWarehouse',
              attributes: ['name', 'code'],
              required: false
            },
            {
              model: require('../models/Location').Warehouse,
              as: 'toWarehouseShift',
              attributes: ['name', 'code'],
              required: false
            },
            {
              model: require('../models/Outturn'),
              as: 'outturn',
              attributes: ['code'],
              required: false
            }
          ]
        }
      ],
      attributes: ['id', 'arrivalId', 'workType', 'workDetail', 'workerName', 'bags', 'rate', 'amount', 'createdAt'],
      order: [['workType', 'ASC'], ['workerName', 'ASC']]
    });

    // Group entries by individual hamali entry (not by work type) to keep entries separate
    const entryGroups = {};

    entries.forEach(entry => {
      // Debug: Log arrival data to see what's available
      console.log('🔍 DEBUG - Arrival data for entry:', {
        arrivalId: entry.arrivalId,
        movementType: entry.arrival?.movementType,
        broker: entry.arrival?.broker,
        toKunchinittu: entry.arrival?.toKunchinittu,
        toWarehouse: entry.arrival?.toWarehouse,
        fromKunchinittu: entry.arrival?.fromKunchinittu,
        fromWarehouse: entry.arrival?.fromWarehouse,
        toWarehouseShift: entry.arrival?.toWarehouseShift
      });

      // Create unique key for each hamali entry group 
      // This groups only the worker splits that were created in the same batch (within 10 seconds)
      const entryKey = `${entry.arrivalId}-${entry.workType}-${entry.workDetail}-${entry.rate}-${Math.floor(new Date(entry.createdAt).getTime() / 10000)}`; // Group by 10-second intervals

      if (!entryGroups[entryKey]) {
        entryGroups[entryKey] = {
          workType: entry.workType,
          workDetail: entry.workDetail,
          arrivalId: entry.arrivalId,
          rate: entry.rate,
          totalBags: 0,
          totalAmount: 0,
          sourceDestination: entry.arrival.broker || 'N/A',
          arrival: entry.arrival, // Include full arrival data
          splits: [],
          createdAt: entry.createdAt
        };
      }

      // Add to totals
      entryGroups[entryKey].totalBags += entry.bags;
      entryGroups[entryKey].totalAmount += parseFloat(entry.amount);

      // Add split information
      entryGroups[entryKey].splits.push({
        workerName: entry.workerName || 'Main Entry',
        batchNumber: entry.batchNumber || 1,
        bags: entry.bags,
        amount: parseFloat(entry.amount)
      });
    });

    // Categorize by work type
    const groupedEntries = {
      loadingEntries: [],
      unloadingEntries: [],
      looseEntries: [],
      cuttingEntries: [],
      plottingEntries: [],
      shiftingEntries: [],
      fillingEntries: []
    };

    Object.values(entryGroups).forEach((group) => {
      const workType = group.workType.toLowerCase();
      if (workType.includes('loading')) {
        groupedEntries.loadingEntries.push(group);
      } else if (workType.includes('unloading')) {
        groupedEntries.unloadingEntries.push(group);
      } else if (workType.includes('loose') && workType.includes('tumb')) {
        groupedEntries.looseEntries.push(group);
      } else if (workType.includes('cutting')) {
        groupedEntries.cuttingEntries.push(group);
      } else if (workType.includes('plotting')) {
        groupedEntries.plottingEntries.push(group);
      } else if (workType.includes('shifting')) {
        groupedEntries.shiftingEntries.push(group);
      } else if (workType.includes('filling')) {
        groupedEntries.fillingEntries.push(group);
      }
    });

    const grandTotal = entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    res.json({
      summary: {
        ...groupedEntries,
        grandTotal,
        totalEntries: entries.length
      }
    });
  } catch (error) {
    console.error('Error fetching paddy hamali summary:', error);
    res.status(500).json({ error: 'Failed to fetch paddy hamali summary' });
  }
});

// DELETE hamali entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;  // ✅ Fixed: Use userId from JWT token
    const userRole = req.user.role;

    const entry = await PaddyHamaliEntry.findByPk(id);

    if (!entry) {
      return res.status(404).json({ error: 'Hamali entry not found' });
    }

    // Only creator can delete pending entries, manager/admin can delete any
    if (entry.status === 'pending' && entry.addedBy !== userId && userRole === 'staff') {
      return res.status(403).json({ error: 'You can only delete your own entries' });
    }

    if (entry.status === 'approved' && userRole === 'staff') {
      return res.status(403).json({ error: 'Cannot delete approved hamali entry' });
    }

    await entry.destroy();

    res.json({ message: 'Hamali entry deleted successfully' });
  } catch (error) {
    console.error('Delete hamali entry error:', error);
    res.status(500).json({ error: 'Failed to delete hamali entry' });
  }
});

// GET batch hamali entries for multiple arrivals - PERFORMANCE OPTIMIZATION
router.get('/batch', auth, async (req, res) => {
  try {
    const { arrivalIds } = req.query;

    console.log('📋 Paddy hamali batch request:', { arrivalIds });

    if (!arrivalIds) {
      return res.json({ entries: [] });
    }

    const ids = arrivalIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return res.json({ entries: [] });
    }

    console.log('📋 Processing arrival IDs:', ids);

    // FIXED: Use correct column name arrival_id (snake_case)
    const { sequelize } = require('../config/database');

    const entries = await sequelize.query(`
      SELECT 
        phe.id,
        phe.arrival_id as "arrivalId",
        phe.work_type as "workType",
        phe.work_detail as "workDetail", 
        phe.worker_name as "workerName",
        phe.batch_number as "batchNumber",
        phe.bags,
        phe.rate,
        phe.amount,
        phe.status,
        phe.created_at as "createdAt",
        phe.updated_at as "updatedAt"
      FROM paddy_hamali_entries phe
      WHERE phe.arrival_id IN (${ids.map(id => `${id}`).join(',')})
      ORDER BY phe.arrival_id ASC, phe.created_at ASC
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('📋 Found paddy hamali entries:', entries.length);

    res.json({
      success: true,
      entries: entries || []
    });
  } catch (error) {
    console.error('❌ Error fetching batch paddy hamali entries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch batch hamali entries: ' + error.message
    });
  }
});

module.exports = router;
