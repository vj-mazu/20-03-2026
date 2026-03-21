const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();
const OtherHamaliEntry = require('../models/OtherHamaliEntry');
const Arrival = require('../models/Arrival');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
const { sequelize } = require('../config/database');

// Get other hamali entries for an arrival
router.get('/arrival/:arrivalId', auth, async (req, res) => {
  try {
    const { arrivalId } = req.params;

    // Set up associations
    const Arrival = require('../models/Arrival');

    // Only set up association if it doesn't already exist
    if (!OtherHamaliEntry.associations.arrival) {
      OtherHamaliEntry.belongsTo(Arrival, { foreignKey: 'arrivalId', as: 'arrival' });
    }

    const entries = await OtherHamaliEntry.findAll({
      where: { arrivalId },
      include: [
        {
          model: User,
          as: 'addedByUser',
          attributes: ['id', 'username']
        },
        {
          model: User,
          as: 'approvedByUser',
          attributes: ['id', 'username']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 500
    });

    const total = entries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);

    res.json({ entries, total });
  } catch (error) {
    console.error('Error fetching other hamali entries:', error);
    res.status(500).json({ error: 'Failed to fetch other hamali entries' });
  }
});

// Get other hamali entries by arrival IDs or rice production IDs (batch)
router.post('/batch', auth, async (req, res) => {
  try {
    const { arrivalIds = [], riceProductionIds = [], stockMovementIds = [] } = req.body;

    if ((!arrivalIds || arrivalIds.length === 0) &&
      (!riceProductionIds || riceProductionIds.length === 0) &&
      (!stockMovementIds || stockMovementIds.length === 0)) {
      return res.json({
        success: true,
        data: { entries: {} }
      });
    }

    const { sequelize } = require('../config/database');
    const { Op } = require('sequelize');
    let allEntries = [];
    const groupedEntries = {};

    // Handle paddy hamali (arrival IDs) - NEW FUNCTIONALITY
    if (arrivalIds.length > 0) {
      try {
        const paddyEntries = await OtherHamaliEntry.findAll({
          where: {
            arrivalId: { [Op.in]: arrivalIds },
            status: 'approved' // Only show approved entries
          },
          include: [
            {
              model: User,
              as: 'addedByUser',
              attributes: ['id', 'username']
            },
            {
              model: User,
              as: 'approvedByUser',
              attributes: ['id', 'username']
            }
          ],
          order: [['createdAt', 'DESC']]
        });

        // Group by arrival ID
        paddyEntries.forEach(entry => {
          const key = entry.arrivalId;
          if (!groupedEntries[key]) {
            groupedEntries[key] = [];
          }
          groupedEntries[key].push({
            id: entry.id,
            work_type: entry.workType,
            work_detail: entry.workDetail,
            rate: entry.rate,
            bags: entry.bags,
            amount: entry.amount,
            worker_name: entry.addedByUser?.username || 'Unknown',
            created_at: entry.createdAt,
            status: entry.status
          });
        });
      } catch (error) {
        console.error('Error fetching paddy other hamali entries:', error);
        // Continue with rice entries even if paddy fails
      }
    }

    // Fetch entries for rice productions
    if (riceProductionIds.length > 0) {
      const prodPlaceholders = riceProductionIds.map((_, index) => `:prodId${index}`).join(',');
      const prodReplacements = {};
      riceProductionIds.forEach((id, index) => {
        prodReplacements[`prodId${index}`] = id;
      });

      const [prodEntries] = await sequelize.query(`
        SELECT 
          rhe.id,
          rhe.rice_production_id,
          rhe.rice_stock_movement_id,
          rhe.entry_type,
          rhe.bags,
          rhe.remarks,
          rhe.created_at,
          rhr.work_type,
          rhr.work_detail,
          rhr.rate_18_21 as rate,
          u.username as created_by_username,
          -- Extract worker name from remarks field
          CASE 
            WHEN rhe.remarks LIKE 'Worker: %' THEN 
              TRIM(SUBSTRING(rhe.remarks FROM 'Worker: ([^,]+)'))
            ELSE u.username
          END as worker_name,
          -- Add rice production details
          rp."productType" as product_type,
          rp.date as production_date,
          rp."locationCode" as location_code,
          o.code as outturn_code,
          o."allottedVariety" as variety,
          p."brandName" as packaging_brand
        FROM rice_hamali_entries rhe
        LEFT JOIN rice_hamali_rates rhr ON rhe.rice_hamali_rate_id = rhr.id
        LEFT JOIN users u ON rhe.created_by = u.id
        LEFT JOIN rice_productions rp ON rhe.rice_production_id = rp.id
        LEFT JOIN outturns o ON rp."outturnId" = o.id
        LEFT JOIN packagings p ON rp."packagingId" = p.id
        WHERE rhe.rice_production_id IN (${prodPlaceholders}) 
          AND rhe.is_active = true
          AND rhe.remarks LIKE 'Other Hamali:%'
        ORDER BY rhe.rice_production_id, rhe.created_at DESC
      `, {
        replacements: prodReplacements
      });

      // Group by rice production ID
      prodEntries.forEach(entry => {
        const key = entry.rice_production_id;
        if (!groupedEntries[key]) {
          groupedEntries[key] = [];
        }
        groupedEntries[key].push(entry);
      });
    }

    // Fetch entries for stock movements
    if (stockMovementIds.length > 0) {
      const movePlaceholders = stockMovementIds.map((_, index) => `:moveId${index}`).join(',');
      const moveReplacements = {};
      stockMovementIds.forEach((id, index) => {
        moveReplacements[`moveId${index}`] = id;
      });

      const [moveEntries] = await sequelize.query(`
        SELECT 
          rhe.id,
          rhe.rice_production_id,
          rhe.rice_stock_movement_id,
          rhe.entry_type,
          rhe.bags,
          rhe.remarks,
          rhe.created_at,
          rhr.work_type,
          rhr.work_detail,
          rhr.rate_18_21 as rate,
          u.username as created_by_username,
          -- Extract worker name from remarks field
          CASE 
            WHEN rhe.remarks LIKE 'Worker: %' THEN 
              TRIM(SUBSTRING(rhe.remarks FROM 'Worker: ([^,]+)'))
            ELSE u.username
          END as worker_name,
          -- Add stock movement details
          rsm.movement_type as movement_type,
          rsm.variety as variety,
          rsm.location_code as location_code,
          rsm.date as movement_date,
          rsm.product_type as product_type,
          p."brandName" as packaging_brand
        FROM rice_hamali_entries rhe
        LEFT JOIN rice_hamali_rates rhr ON rhe.rice_hamali_rate_id = rhr.id
        LEFT JOIN users u ON rhe.created_by = u.id
        LEFT JOIN rice_stock_movements rsm ON rhe.rice_stock_movement_id = rsm.id
        LEFT JOIN packagings p ON rsm."packagingId" = p.id
        WHERE rhe.rice_stock_movement_id IN (${movePlaceholders}) 
          AND rhe.is_active = true
          AND rhe.remarks LIKE 'Other Hamali:%'
        ORDER BY rhe.rice_stock_movement_id, rhe.created_at DESC
      `, {
        replacements: moveReplacements
      });

      // Group by stock movement ID with "movement-" prefix
      moveEntries.forEach(entry => {
        const key = `movement-${entry.rice_stock_movement_id}`;
        if (!groupedEntries[key]) {
          groupedEntries[key] = [];
        }
        groupedEntries[key].push(entry);
      });
    }

    res.json({
      success: true,
      data: { entries: groupedEntries }
    });
  } catch (error) {
    console.error('Error fetching other hamali entries batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch other hamali entries'
    });
  }
});

// Create other hamali entries (bulk)
router.post('/bulk', auth, async (req, res) => {
  try {
    const { arrivalId, riceProductionId, stockMovementId, movementType, isStockMovement, entries } = req.body;

    if ((!arrivalId && !riceProductionId && !stockMovementId) || !entries || !Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'Arrival ID, Rice Production ID, or Stock Movement ID and entries array are required' });
    }

    // Verify arrival, rice production, or stock movement exists
    if (arrivalId) {
      const arrival = await Arrival.findByPk(arrivalId);
      if (!arrival) {
        return res.status(404).json({ error: 'Arrival not found' });
      }
    }

    if (riceProductionId && !isStockMovement) {
      const { sequelize } = require('../config/database');
      const [riceProduction] = await sequelize.query(`
        SELECT id FROM rice_productions WHERE id = :riceProductionId
      `, {
        replacements: { riceProductionId }
      });

      if (riceProduction.length === 0) {
        return res.status(404).json({ error: 'Rice production not found' });
      }
    }

    if (stockMovementId && isStockMovement) {
      const { sequelize } = require('../config/database');
      const [stockMovement] = await sequelize.query(`
        SELECT id FROM rice_stock_movements WHERE id = :stockMovementId
      `, {
        replacements: { stockMovementId }
      });

      if (stockMovement.length === 0) {
        return res.status(404).json({ error: 'Stock movement not found' });
      }

      console.log('✅ Processing other hamali for stock movement:', { stockMovementId, movementType });
    }

    // Validate and create/update entries (prevent duplicates)
    const processedEntries = [];
    for (const entry of entries) {
      const { workType, workDetail, description, rate, bags, workerName, batchNumber } = entry;
      let processedEntry;

      if (!workType || !workDetail || !rate || !bags) {
        return res.status(400).json({ error: 'Work type, detail, rate, and bags are required for each entry' });
      }

      if (bags <= 0) {
        return res.status(400).json({ error: 'Bags must be greater than 0' });
      }

      const amount = parseFloat(rate) * parseInt(bags);

      // Handle Rice Production and Stock Movement entries (using Rice Hamali rates for Other Hamali)
      if (riceProductionId || isStockMovement) {
        // For Rice Production and Stock Movements, we use Rice Hamali rates, so we need to find the rate ID
        const [rateResult] = await sequelize.query(`
          SELECT id FROM rice_hamali_rates 
          WHERE work_type = :workType AND work_detail = :workDetail AND is_active = true
          LIMIT 1
        `, {
          replacements: { workType, workDetail }
        });

        if (rateResult.length === 0) {
          return res.status(400).json({ error: `Rice hamali rate not found for ${workType} - ${workDetail}` });
        }

        const riceHamaliRateId = rateResult[0].id;

        // Insert into rice_hamali_entries table (since it's using Rice Hamali rates)
        const [result] = await sequelize.query(`
          INSERT INTO rice_hamali_entries (
            rice_production_id, 
            rice_stock_movement_id,
            entry_type,
            rice_hamali_rate_id, 
            bags,
            rate,
            amount,
            remarks,
            status,
            is_active,
            created_by
          ) VALUES (:riceProductionId, :stockMovementId, :entryType, :riceHamaliRateId, :bags, :rate, :amount, :remarks, :status, true, :createdBy)
          RETURNING *
        `, {
          replacements: {
            riceProductionId: isStockMovement ? null : riceProductionId,
            stockMovementId: isStockMovement ? stockMovementId : null,
            entryType: isStockMovement ? movementType : 'production',
            riceHamaliRateId,
            bags,
            rate: parseFloat(rate),
            amount: parseFloat(rate) * parseInt(bags),
            remarks: `Other Hamali: ${description || ''}, ${workerName ? `Worker: ${workerName}, ` : ''}${batchNumber ? `Batch: ${batchNumber}, ` : ''}Rate: ₹${rate}`,
            status: req.user.role === 'staff' ? 'pending' : 'approved',
            createdBy: req.user.userId
          }
        });

        processedEntry = result[0];
      } else {
        // Handle Paddy Arrival entries (existing logic)
        const existingEntry = await OtherHamaliEntry.findOne({
          where: {
            arrivalId: parseInt(arrivalId),
            workType,
            workDetail,
            workerName: workerName || null,
            addedBy: req.user.userId
          }
        });

        // Determine status based on user role
        const status = (req.user.role === 'manager' || req.user.role === 'admin') ? 'approved' : 'pending';
        const approvedBy = (status === 'approved') ? req.user.userId : null;
        const approvedAt = (status === 'approved') ? new Date() : null;

        if (existingEntry) {
          // Update existing entry instead of creating new one
          await existingEntry.update({
            description: description || existingEntry.description,
            rate: parseFloat(rate),
            bags: parseInt(bags),
            amount,
            batchNumber: batchNumber || existingEntry.batchNumber,
            status,
            approvedBy,
            approvedAt
          });
          processedEntry = existingEntry;
        } else {
          // Create new entry
          processedEntry = await OtherHamaliEntry.create({
            arrivalId: parseInt(arrivalId),
            workType,
            workDetail,
            description: description || null,
            rate: parseFloat(rate),
            bags: parseInt(bags),
            amount,
            workerName: workerName || null,
            batchNumber: batchNumber || null,
            status,
            addedBy: req.user.userId,
            approvedBy,
            approvedAt
          });
        }
      }

      processedEntries.push(processedEntry);
    }

    const autoApproved = req.user.role === 'manager' || req.user.role === 'admin';

    res.status(201).json({
      message: `${processedEntries.length} other hamali ${processedEntries.length === 1 ? 'entry' : 'entries'} processed successfully`,
      entries: processedEntries,
      autoApproved
    });
  } catch (error) {
    console.error('Error creating other hamali entries:', error);
    res.status(500).json({ error: 'Failed to create other hamali entries' });
  }
});

// Update other hamali entry
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { workType, workDetail, description, rate, bags } = req.body;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const entry = await OtherHamaliEntry.findByPk(id);

    if (!entry) {
      return res.status(404).json({ error: 'Other hamali entry not found' });
    }

    // Check permissions
    if (entry.status === 'approved' && userRole === 'staff') {
      return res.status(403).json({ error: 'Cannot edit approved hamali entry' });
    }

    if (entry.status === 'pending' && entry.addedBy !== userId && userRole === 'staff') {
      return res.status(403).json({ error: 'You can only edit your own entries' });
    }

    // Update entry
    const amount = parseFloat(rate) * parseInt(bags);

    await entry.update({
      workType: workType || entry.workType,
      workDetail: workDetail || entry.workDetail,
      description: description || entry.description,
      rate: parseFloat(rate),
      bags: parseInt(bags),
      amount
    });

    res.json({ message: 'Other hamali entry updated successfully', entry });
  } catch (error) {
    console.error('Update other hamali entry error:', error);
    res.status(500).json({ error: 'Failed to update other hamali entry' });
  }
});

// Approve other hamali entry (manager/admin only)
router.post('/:id/approve', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const entry = await OtherHamaliEntry.findByPk(id);
    if (!entry) {
      return res.status(404).json({ error: 'Other hamali entry not found' });
    }

    if (entry.status === 'approved') {
      return res.status(400).json({ error: 'Entry is already approved' });
    }

    await entry.update({
      status: 'approved',
      approvedBy: req.user.userId,
      approvedAt: new Date()
    });

    res.json({ message: 'Other hamali entry approved successfully' });
  } catch (error) {
    console.error('Error approving other hamali entry:', error);
    res.status(500).json({ error: 'Failed to approve other hamali entry' });
  }
});

// Get summary for hamali book (includes other hamali entries)
router.get('/summary/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;

    // Set up the association here to ensure it's available
    const Arrival = require('../models/Arrival');

    // Only set up association if it doesn't already exist
    if (!OtherHamaliEntry.associations.arrival) {
      OtherHamaliEntry.belongsTo(Arrival, { foreignKey: 'arrivalId', as: 'arrival' });
    }

    let allOtherHamaliEntries = {};
    let grandTotal = 0;
    let totalEntries = 0;

    // 1. Get paddy other hamali entries (existing logic)
    try {
      const paddyEntries = await OtherHamaliEntry.findAll({
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
                model: require('../models/Outturn'),
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
            ]
          }
        ],
        order: [['workType', 'ASC'], ['workerName', 'ASC']],
        limit: 1000
      });

      // Group paddy other hamali entries
      paddyEntries.forEach(entry => {
        const key = `paddy-${entry.arrivalId}-${entry.workType}-${entry.workDetail}`;

        if (!allOtherHamaliEntries[key]) {
          allOtherHamaliEntries[key] = {
            workType: entry.workType,
            workDetail: entry.workDetail,
            description: entry.description,
            arrivalId: entry.arrivalId,
            rate: entry.rate,
            totalBags: 0,
            totalAmount: 0,
            sourceDestination: entry.arrival.broker || 'N/A',
            arrival: entry.arrival,
            splits: [],
            createdAt: entry.createdAt,
            entrySource: 'paddy'
          };
        }

        allOtherHamaliEntries[key].totalBags += entry.bags;
        allOtherHamaliEntries[key].totalAmount += parseFloat(entry.amount);

        allOtherHamaliEntries[key].splits.push({
          workerName: entry.workerName || 'Main Entry',
          batchNumber: entry.batchNumber || 1,
          bags: entry.bags,
          amount: parseFloat(entry.amount)
        });
      });

      grandTotal += paddyEntries.reduce((sum, entry) => sum + parseFloat(entry.amount), 0);
      totalEntries += paddyEntries.length;
    } catch (paddyError) {
      console.error('Error fetching paddy other hamali entries:', paddyError);
      // Continue with rice entries even if paddy fails
    }

    // 2. Get rice other hamali entries (from rice_hamali_entries table with "Other Hamali:" in remarks)
    try {
      // Check if rice_hamali_entries table exists
      const [tableExists] = await sequelize.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rice_hamali_entries'
      `);

      if (tableExists.length > 0) {
        // Get rice productions and stock movements for the date
        const [riceProductions] = await sequelize.query(`
          SELECT id FROM rice_productions WHERE date = :date
        `, { replacements: { date } });

        const [riceStockMovements] = await sequelize.query(`
          SELECT id FROM rice_stock_movements WHERE date = :date
        `, { replacements: { date } });

        let riceOtherEntries = [];

        // Fetch rice production other hamali entries
        if (riceProductions.length > 0) {
          const riceProductionIds = riceProductions.map(rp => rp.id);
          const prodPlaceholders = riceProductionIds.map((_, index) => `:prodId${index}`).join(',');
          const prodReplacements = {};
          riceProductionIds.forEach((id, index) => {
            prodReplacements[`prodId${index}`] = id;
          });

          const [prodOtherEntries] = await sequelize.query(`
            SELECT 
              rhe.id,
              rhe.rice_production_id,
              rhe.rice_stock_movement_id,
              rhe.entry_type,
              rhe.bags,
              rhe.remarks,
              rhe.created_at,
              rhr.work_type,
              rhr.work_detail,
              rhr.rate_18_21 as rate,
              u.username as created_by_username,
              CASE 
                WHEN rhe.remarks LIKE 'Worker: %' THEN 
                  TRIM(SUBSTRING(rhe.remarks FROM 'Worker: ([^,]+)'))
                ELSE u.username
              END as worker_name,
              rp."productType" as product_type,
              rp.date as production_date,
              rp."locationCode" as location_code,
              o.code as outturn_code,
              o."allottedVariety" as variety,
              p."brandName" as packaging_brand
            FROM rice_hamali_entries rhe
            LEFT JOIN rice_hamali_rates rhr ON rhe.rice_hamali_rate_id = rhr.id
            LEFT JOIN users u ON rhe.created_by = u.id
            LEFT JOIN rice_productions rp ON rhe.rice_production_id = rp.id
            LEFT JOIN outturns o ON rp."outturnId" = o.id
            LEFT JOIN packagings p ON rp."packagingId" = p.id
            WHERE rhe.rice_production_id IN (${prodPlaceholders}) 
              AND rhe.is_active = true
              AND rhe.remarks LIKE 'Other Hamali:%'
            ORDER BY rhe.rice_production_id, rhe.created_at DESC
          `, {
            replacements: prodReplacements
          });

          riceOtherEntries = riceOtherEntries.concat(prodOtherEntries);
        }

        // Fetch stock movement other hamali entries
        if (riceStockMovements.length > 0) {
          const stockMovementIds = riceStockMovements.map(rsm => rsm.id);
          const moveReplacements = {};
          const movePlaceholders = stockMovementIds.map((_, index) => `:moveId${index}`).join(',');
          stockMovementIds.forEach((id, index) => {
            moveReplacements[`moveId${index}`] = id;
          });

          const [moveOtherEntries] = await sequelize.query(`
            SELECT 
              rhe.id,
              rhe.rice_production_id,
              rhe.rice_stock_movement_id,
              rhe.entry_type,
              rhe.bags,
              rhe.remarks,
              rhe.created_at,
              rhr.work_type,
              rhr.work_detail,
              rhr.rate_18_21 as rate,
              u.username as created_by_username,
              CASE 
                WHEN rhe.remarks LIKE 'Worker: %' THEN 
                  TRIM(SUBSTRING(rhe.remarks FROM 'Worker: ([^,]+)'))
                ELSE u.username
              END as worker_name,
              rsm.movement_type as movement_type,
              rsm.variety as variety,
              rsm.location_code as location_code,
              rsm.date as movement_date,
              rsm.product_type as product_type,
              p."brandName" as packaging_brand,
              rsm.bill_number as bill_number,
              rsm.lorry_number as lorry_number
            FROM rice_hamali_entries rhe
            LEFT JOIN rice_hamali_rates rhr ON rhe.rice_hamali_rate_id = rhr.id
            LEFT JOIN users u ON rhe.created_by = u.id
            LEFT JOIN rice_stock_movements rsm ON rhe.rice_stock_movement_id = rsm.id
            LEFT JOIN packagings p ON rsm."packagingId" = p.id
            WHERE rhe.rice_stock_movement_id IN (${movePlaceholders}) 
              AND rhe.is_active = true
              AND rhe.remarks LIKE 'Other Hamali:%'
            ORDER BY rhe.rice_stock_movement_id, rhe.created_at DESC
          `, {
            replacements: moveReplacements
          });

          riceOtherEntries = riceOtherEntries.concat(moveOtherEntries);
        }

        // Group rice other hamali entries
        riceOtherEntries.forEach(entry => {
          const key = `rice-${entry.rice_production_id || entry.rice_stock_movement_id}-${entry.work_type}-${entry.work_detail}`;

          if (!allOtherHamaliEntries[key]) {
            allOtherHamaliEntries[key] = {
              workType: entry.work_type,
              workDetail: entry.work_detail,
              description: entry.remarks ? entry.remarks.replace('Other Hamali: ', '').split(',')[0] : '',
              riceProductionId: entry.rice_production_id,
              riceStockMovementId: entry.rice_stock_movement_id,
              rate: entry.rate,
              totalBags: 0,
              totalAmount: 0,
              variety: entry.variety || entry.outturn_code || 'Unknown Variety',
              location: entry.location_code || entry.packaging_brand || 'Unknown Location',
              movementType: entry.movement_type || entry.entry_type || 'production',
              productType: entry.product_type || 'Rice',
              billNumber: entry.bill_number || '',
              lorryNumber: entry.lorry_number || '',
              splits: [],
              createdAt: entry.created_at,
              entrySource: 'rice'
            };
          }

          allOtherHamaliEntries[key].totalBags += entry.bags;
          allOtherHamaliEntries[key].totalAmount += (entry.rate || 0) * entry.bags;

          allOtherHamaliEntries[key].splits.push({
            workerName: entry.worker_name || entry.created_by_username || 'Main Entry',
            bags: entry.bags,
            amount: (entry.rate || 0) * entry.bags
          });
        });

        grandTotal += riceOtherEntries.reduce((sum, entry) => sum + ((entry.rate || 0) * entry.bags), 0);
        totalEntries += riceOtherEntries.length;
      }
    } catch (riceError) {
      console.error('Error fetching rice other hamali entries:', riceError);
      // Continue even if rice fails
    }

    res.json({
      summary: {
        otherHamaliEntries: allOtherHamaliEntries,
        grandTotal,
        totalEntries
      }
    });
  } catch (error) {
    console.error('Error fetching other hamali summary:', error);
    res.status(500).json({ error: 'Failed to fetch other hamali summary' });
  }
});

// GET batch other hamali entries for multiple arrivals - PERFORMANCE OPTIMIZATION
router.get('/batch', auth, async (req, res) => {
  try {
    const { arrivalIds } = req.query;

    if (!arrivalIds) {
      return res.json({ entries: [] });
    }

    const ids = arrivalIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return res.json({ entries: [] });
    }

    // Enhanced query with warehouse/kunchinittu information
    const { sequelize } = require('../config/database');
    const placeholders = ids.map((_, index) => `:id${index}`).join(',');
    const replacements = {};
    ids.forEach((id, index) => {
      replacements[`id${index}`] = id;
    });

    const [entries] = await sequelize.query(`
      SELECT 
        ohe.id,
        ohe."arrivalId" as arrivalId,
        ohe."workType" as work_type,
        ohe."workDetail" as work_detail,
        ohe."workerName" as worker_name,
        ohe.description,
        ohe.bags,
        ohe.rate,
        ohe.amount,
        ohe.status,
        ohe."createdAt" as created_at,
        -- Add arrival details with warehouse/kunchinittu names
        a."slNo" as arrival_sl_no,
        a.broker,
        a."movementType" as movement_type,
        a.variety,
        -- From locations
        fkn.name as from_kunchinittu_name,
        fkn.code as from_kunchinittu_code,
        fwh.name as from_warehouse_name,
        fwh.code as from_warehouse_code,
        -- To locations
        tkn.name as to_kunchinittu_name,
        tkn.code as to_kunchinittu_code,
        twh.name as to_warehouse_name,
        twh.code as to_warehouse_code,
        -- Shift warehouse
        swh.name as shift_warehouse_name,
        swh.code as shift_warehouse_code,
        -- Outturn info
        o.code as outturn_code
      FROM other_hamali_entries ohe
      LEFT JOIN arrivals a ON ohe."arrivalId" = a.id
      LEFT JOIN kunchininttus fkn ON a."fromKunchinintuId" = fkn.id
      LEFT JOIN warehouses fwh ON a."fromWarehouseId" = fwh.id
      LEFT JOIN kunchininttus tkn ON a."toKunchinintuId" = tkn.id
      LEFT JOIN warehouses twh ON a."toWarehouseId" = twh.id
      LEFT JOIN warehouses swh ON a."toWarehouseShiftId" = swh.id
      LEFT JOIN outturns o ON a."outturnId" = o.id
      WHERE ohe."arrivalId" IN (${placeholders})
      ORDER BY ohe."arrivalId" ASC, ohe."createdAt" ASC
    `, {
      replacements
    });

    res.json({ entries });
  } catch (error) {
    console.error('Error fetching batch other hamali entries:', error);
    res.status(500).json({ error: 'Failed to fetch batch hamali entries' });
  }
});

// Create other hamali entry for rice production
router.post('/', auth, async (req, res) => {
  try {
    const {
      riceProductionId,
      otherHamaliWorkId,
      bags,
      remarks
    } = req.body;

    // Validate required fields
    if (!riceProductionId || !otherHamaliWorkId || !bags) {
      return res.status(400).json({
        success: false,
        error: 'Rice production ID, other hamali work ID, and bags are required'
      });
    }

    const { sequelize } = require('../config/database');

    // Check if rice production exists
    const [riceProduction] = await sequelize.query(`
      SELECT id, bags as total_bags FROM rice_productions WHERE id = :riceProductionId
    `, {
      replacements: { riceProductionId }
    });

    if (riceProduction.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Rice production not found'
      });
    }

    // Check if other hamali work exists
    const [otherHamaliWork] = await sequelize.query(`
      SELECT id FROM other_hamali_works WHERE id = :otherHamaliWorkId AND is_active = true
    `, {
      replacements: { otherHamaliWorkId }
    });

    if (otherHamaliWork.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Other hamali work not found'
      });
    }

    // Validate bags don't exceed total
    if (bags > riceProduction[0].total_bags) {
      return res.status(400).json({
        success: false,
        error: `Bags cannot exceed total production bags (${riceProduction[0].total_bags})`
      });
    }

    const [result] = await sequelize.query(`
      INSERT INTO other_hamali_entries 
      (rice_production_id, other_hamali_work_id, bags, remarks, created_by)
      VALUES (:riceProductionId, :otherHamaliWorkId, :bags, :remarks, :createdBy)
      RETURNING *
    `, {
      replacements: {
        riceProductionId,
        otherHamaliWorkId,
        bags,
        remarks: remarks || null,
        createdBy: req.user.userId
      }
    });

    res.json({
      success: true,
      message: 'Other hamali entry added successfully',
      data: result[0]
    });
  } catch (error) {
    console.error('Error adding other hamali entry:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add other hamali entry'
    });
  }
});

module.exports = router;
