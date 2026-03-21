const express = require('express');
const { Op } = require('sequelize');
const { auth, authorize } = require('../middleware/auth');
const RiceProduction = require('../models/RiceProduction');
const Outturn = require('../models/Outturn');
const Packaging = require('../models/Packaging');
const User = require('../models/User');
const Arrival = require('../models/Arrival');
const ByProduct = require('../models/ByProduct');
const YieldCalculationService = require('../services/YieldCalculationService');
const ByProductSyncService = require('../services/ByProductSyncService');

const router = express.Router();

// Helper function to calculate paddy bags deducted from rice quintals
const calculatePaddyBagsDeducted = (quintals, productType) => {
  // No deduction for Bran, Farm Bran, and Faram
  const noDeductionProducts = ['Bran', 'Farm Bran', 'Faram'];
  if (noDeductionProducts.includes(productType)) {
    return 0;
  }

  // For all other products: quintals ÷ 0.47
  const result = quintals / 0.47;

  // Rounding: < 0.5 round down, >= 0.5 round up
  return Math.round(result);
};

// Get all rice productions with pagination - OPTIMIZED WITH CACHING
router.get('/', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const { month, dateFrom, dateTo, outturnId, status, limit = 100, page = 1 } = req.query;

    // Create cache key
    const cacheKey = `rice-productions:${page}:${limit}:${outturnId || ''}:${status || ''}:${dateFrom || ''}:${dateTo || ''}:${month || ''}`;

    // Try cache first
    const cached = await require('../services/cacheService').get(cacheKey);
    if (cached) {
      const responseTime = Date.now() - startTime;
      return res.json({ ...cached, performance: { responseTime: `${responseTime}ms`, cached: true } });
    }

    const where = {};

    // OPTIMIZED: Combined date filtering logic
    const dateConditions = [];

    // 1. Month-wise filtering
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const endDate = `${year}-${monthNum.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      dateConditions.push({
        [Op.gte]: startDate,
        [Op.lte]: endDate
      });
    }

    // 2. Date Range filtering
    if (dateFrom || dateTo) {
      const rangeCondition = {};
      if (dateFrom) rangeCondition[Op.gte] = dateFrom;
      if (dateTo) rangeCondition[Op.lte] = dateTo;
      dateConditions.push(rangeCondition);
    }

    // Combine conditions if multiple exist
    if (dateConditions.length > 0) {
      if (dateConditions.length === 1) {
        where.date = dateConditions[0];
      } else {
        where.date = { [Op.and]: dateConditions };
      }
    }

    if (outturnId) where.outturnId = outturnId;
    if (status) where.status = status;

    // Pagination setup
    const limitNum = Math.min(parseInt(limit), 5000); // Increased from 500 for Paddy Stock accuracy
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination (only on first page for performance)
    const totalCount = pageNum === 1 ? await RiceProduction.count({ where }) : null;

    const productions = await RiceProduction.findAll({
      where,
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'type'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset,
      subQuery: false // Prevent N+1 queries
    });

    const result = {
      productions,
      pagination: {
        totalRecords: totalCount || productions.length,
        recordsReturned: productions.length,
        page: pageNum,
        limit: limitNum,
        totalPages: totalCount ? Math.ceil(totalCount / limitNum) : 1,
        hasNextPage: productions.length === limitNum,
        hasPrevPage: pageNum > 1
      }
    };

    // Cache for 60 seconds
    await require('../services/cacheService').set(cacheKey, result, 60);

    const responseTime = Date.now() - startTime;
    res.json({ ...result, performance: { responseTime: `${responseTime}ms`, cached: false } });
  } catch (error) {
    console.error('Get rice productions error:', error);
    res.status(500).json({ error: 'Failed to fetch rice productions' });
  }
});

// Get pending rice productions for approval (managers/admins only)
router.get('/pending-list', auth, async (req, res) => {
  try {
    // Only managers and admins can view pending list
    if (req.user.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Manager or Admin role required.' });
    }

    const productions = await RiceProduction.findAll({
      where: { status: 'pending' },
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'type'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: 500
    });

    res.json({ productions });
  } catch (error) {
    console.error('Get pending rice productions error:', error);
    res.status(500).json({ error: 'Failed to fetch pending rice productions' });
  }
});

// Bulk approve rice productions
router.post('/bulk-approve', auth, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Manager or Admin role required.' });
    }

    const { productionIds } = req.body;
    if (!productionIds || !Array.isArray(productionIds) || productionIds.length === 0) {
      return res.status(400).json({ error: 'Production IDs are required' });
    }

    await RiceProduction.update(
      {
        status: 'approved',
        approvedBy: req.user.userId,
        approvedAt: new Date()
      },
      { where: { id: productionIds, status: 'pending' } }
    );

    // Clear cache
    await require('../services/cacheService').clear();

    res.json({ message: `${productionIds.length} production(s) approved successfully` });
  } catch (error) {
    console.error('Bulk approve rice productions error:', error);
    res.status(500).json({ error: 'Failed to approve rice productions' });
  }
});

// Bulk reject rice productions
router.post('/bulk-reject', auth, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Manager or Admin role required.' });
    }

    const { productionIds, remarks } = req.body;
    if (!productionIds || !Array.isArray(productionIds) || productionIds.length === 0) {
      return res.status(400).json({ error: 'Production IDs are required' });
    }

    await RiceProduction.update(
      {
        status: 'rejected',
        rejectionRemarks: remarks || null
      },
      { where: { id: productionIds, status: 'pending' } }
    );

    // Clear cache
    await require('../services/cacheService').clear();

    res.json({ message: `${productionIds.length} production(s) rejected successfully` });
  } catch (error) {
    console.error('Bulk reject rice productions error:', error);
    res.status(500).json({ error: 'Failed to reject rice productions' });
  }
});

// Get rice productions by outturn
router.get('/outturn/:id', auth, async (req, res) => {
  try {
    const productions = await RiceProduction.findAll({
      where: { outturnId: req.params.id },
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'type'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] }
      ],
      order: [['date', 'DESC']]
    });

    res.json({ productions });
  } catch (error) {
    console.error('Get outturn productions error:', error);
    res.status(500).json({ error: 'Failed to fetch outturn productions' });
  }
});

// Get available bags for outturn
router.get('/outturn/:id/available-bags', auth, async (req, res) => {
  try {
    const outturnId = req.params.id;

    console.log('🔍 Fetching available bags for outturn:', outturnId);

    // First, check if outurn is cleared
    const outturn = await Outturn.findByPk(outturnId);
    if (!outturn) {
      return res.status(404).json({ error: 'Outturn not found' });
    }

    // If outurn is cleared, return zero available bags with cleared status
    if (outturn.isCleared) {
      console.log('🔒 Outturn is cleared, returning zero available bags');
      return res.json({
        availableBags: 0,
        totalBags: 0,
        usedBags: 0,
        isCleared: true,
        clearedAt: outturn.clearedAt,
        remainingBags: outturn.remainingBags
      });
    }

    // Get total bags for this outturn (production-shifting + for-production purchases)
    const productionShiftingBags = await Arrival.sum('bags', {
      where: {
        outturnId: outturnId,
        movementType: { [Op.in]: ['production-shifting', 'purchase'] }
      }
    }) || 0;

    console.log('📊 Total paddy bags found:', productionShiftingBags);

    // Get total paddy bags already DEDUCTED from productions
    const usedPaddyBagsDeducted = await RiceProduction.sum('paddyBagsDeducted', {
      where: {
        outturnId: outturnId,
        status: { [Op.in]: ['pending', 'approved'] }
      }
    }) || 0;

    console.log('📊 Used paddy bags (deducted):', usedPaddyBagsDeducted);

    // Calculate available bags (Total - Paddy Bags Deducted)
    const availableBags = productionShiftingBags - usedPaddyBagsDeducted;

    res.json({
      availableBags,
      totalBags: productionShiftingBags,
      usedBags: usedPaddyBagsDeducted,
      isCleared: false
    });
  } catch (error) {
    console.error('Get available bags error:', error);
    res.status(500).json({ error: 'Failed to fetch available bags' });
  }
});

// Get available paddy bags for outturn
router.get('/outturn/:id/available-paddy-bags', auth, async (req, res) => {
  try {
    const outturnId = req.params.id;

    console.log('🔍 Fetching available paddy bags for outturn:', outturnId);

    // First, check if outurn is cleared
    const outturn = await Outturn.findByPk(outturnId);
    if (!outturn) {
      return res.status(404).json({ error: 'Outturn not found' });
    }

    // If outurn is cleared, return zero available bags with cleared status
    if (outturn.isCleared) {
      console.log('🔒 Outturn is cleared, returning zero available bags');
      return res.json({
        availablePaddyBags: 0,
        totalPaddyBags: 0,
        usedPaddyBags: 0,
        isCleared: true,
        clearedAt: outturn.clearedAt,
        remainingBags: outturn.remainingBags
      });
    }

    // Get total paddy bags for this outturn (production-shifting + for-production purchases)
    const totalPaddyBags = await Arrival.sum('bags', {
      where: {
        outturnId: outturnId,
        movementType: { [Op.in]: ['production-shifting', 'purchase'] }
      }
    }) || 0;

    console.log('📊 Total paddy bags found:', totalPaddyBags);

    // Get total paddy bags already DEDUCTED from productions
    const usedPaddyBagsDeducted = await RiceProduction.sum('paddyBagsDeducted', {
      where: {
        outturnId: outturnId,
        status: { [Op.in]: ['pending', 'approved'] }
      }
    }) || 0;

    console.log('📊 Used paddy bags (deducted):', usedPaddyBagsDeducted);

    // Calculate available paddy bags (Total Paddy - Already Deducted)
    const availablePaddyBags = totalPaddyBags - usedPaddyBagsDeducted;

    res.json({
      availablePaddyBags,
      totalPaddyBags,
      usedPaddyBags: usedPaddyBagsDeducted, // Return deducted bags for frontend
      isCleared: false
    });
  } catch (error) {
    console.error('Get available paddy bags error:', error);
    res.status(500).json({ error: 'Failed to fetch available paddy bags' });
  }
});

// Validate rice production date - validation removed, always return valid
router.post('/validate-date', auth, async (req, res) => {
  try {
    // Date validation removed - allow any date for rice production entry
    res.json({ valid: true });
  } catch (error) {
    console.error('Validate date error:', error);
    res.status(500).json({ error: 'Failed to validate date' });
  }
});

// Create rice production
router.post('/', auth, async (req, res) => {
  try {
    const {
      outturnId,
      outturnNumber,
      date,
      productType,
      bags,
      packagingId,
      movementType,
      locationCode,
      lorryNumber,
      billNumber
    } = req.body;

    // DETAILED LOGGING FOR SIZER BROKEN
    if (productType === 'Sizer Broken') {
      console.log('🔍 SERVER: SIZER BROKEN RECEIVED:');
      console.log('  - Product Type:', productType);
      console.log('  - Product Type Length:', productType.length);
      console.log('  - Product Type Char Codes:', Array.from(productType).map(c => c.charCodeAt(0)));
      console.log('  - Exact Match Test:', productType === 'Sizer Broken');
      console.log('  - Full Request Body:', JSON.stringify(req.body, null, 2));
    }

    // Convert outturnNumber to outturnId if needed
    let finalOutturnId = outturnId;
    if (!finalOutturnId && outturnNumber) {
      const outturn = await Outturn.findOne({ where: { code: outturnNumber } });
      if (!outturn) {
        return res.status(400).json({ error: 'Invalid outturn number' });
      }
      finalOutturnId = outturn.id;
    }

    // Validate required fields
    if (!finalOutturnId || !date || !productType || !bags || !packagingId || !movementType) {
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // PHASE 1: PRODUCT TYPE MAPPING AND VALIDATION
    // Map frontend display names to database enum values
    const PRODUCT_TYPE_MAPPING = {
      'RJ Rice 2': 'RJ Rice 2',
      'RJ Rice 1': 'RJ Rice 1',
      '0 Broken': 'Zero Broken'
    };

    // Map the product type if needed
    let dbProductType = PRODUCT_TYPE_MAPPING[productType] || productType;

    // Validate that the mapped productType is one of the allowed database values
    const VALID_DB_PRODUCT_TYPES = [
      'Rice', 'Bran', 'Farm Bran', 'Rejection Rice',
      'Sizer Broken', 'Rejection Broken', 'RJ Broken', 'Broken', 'Zero Broken',
      'Faram', 'Unpolished', 'RJ Rice 1', 'RJ Rice 2'
    ];

    if (!VALID_DB_PRODUCT_TYPES.includes(dbProductType)) {
      console.log(`❌ Invalid product type received: "${productType}" (mapped to: "${dbProductType}")`);
      return res.status(400).json({
        error: 'Invalid product type',
        received: productType,
        mapped: dbProductType,
        valid: VALID_DB_PRODUCT_TYPES,
        message: `Product type "${productType}" is not valid. Must be one of: ${VALID_DB_PRODUCT_TYPES.join(', ')}`
      });
    }

    // Log RJ Broken usage specifically
    if (productType === 'RJ Broken') {
      console.log(`✅ Using RJ Broken as valid product type`);
    }

    console.log(`📝 Creating rice production with product type: ${productType} (DB: ${dbProductType})`);

    // Check if outurn is cleared
    const outturn = await Outturn.findByPk(finalOutturnId);
    if (!outturn) {
      return res.status(400).json({ error: 'Outturn not found' });
    }

    if (outturn.isCleared) {
      return res.status(400).json({
        error: `Cannot create rice production for cleared outurn ${outturn.code}. This outurn was cleared on ${new Date(outturn.clearedAt).toLocaleDateString()}.`,
        isCleared: true,
        clearedAt: outturn.clearedAt
      });
    }

    // Validate movement type specific fields
    if (movementType === 'kunchinittu' && !locationCode) {
      return res.status(400).json({ error: 'Location code is required for kunchinittu movement' });
    }

    if (movementType === 'loading' && (!lorryNumber || !billNumber)) {
      return res.status(400).json({ error: 'Lorry number and bill number are required for loading movement' });
    }

    // Get packaging details for calculation
    const packaging = await Packaging.findByPk(packagingId);
    if (!packaging) {
      return res.status(400).json({ error: 'Invalid packaging selected' });
    }

    // Calculate quintals: (bags × kg_per_bag) / 100
    const bagsNum = parseFloat(bags);
    const kgPerBag = parseFloat(packaging.allottedKg);
    const quantityQuintals = (bagsNum * kgPerBag) / 100;

    // Calculate paddy bags deducted using new formula
    const paddyBagsDeducted = calculatePaddyBagsDeducted(quantityQuintals, dbProductType);

    // Validate available paddy bags for this outturn
    // Get total paddy bags for this outturn (production-shifting + for-production purchases)
    const totalPaddyBags = await Arrival.sum('bags', {
      where: {
        outturnId: finalOutturnId,
        movementType: { [Op.in]: ['production-shifting', 'purchase'] }
      }
    }) || 0;

    // Get total paddy bags already DEDUCTED (not user-entered bags)
    const usedPaddyBagsDeducted = await RiceProduction.sum('paddyBagsDeducted', {
      where: {
        outturnId: finalOutturnId,
        status: { [Op.in]: ['pending', 'approved'] }
      }
    }) || 0;

    // Calculate available paddy bags (Total - Already Deducted)
    const availablePaddyBags = totalPaddyBags - usedPaddyBagsDeducted;

    // Check if NEW paddyBagsDeducted would exceed available paddy bags
    // FIX: Compare deducted bags, not user-entered bags
    if (paddyBagsDeducted > availablePaddyBags) {
      return res.status(400).json({
        error: `Insufficient paddy bags available. Available: ${availablePaddyBags} bags, Required: ${paddyBagsDeducted} bags (for ${bags} rice bags)`,
        availablePaddyBags,
        requiredPaddyBags: paddyBagsDeducted
      });
    }

    // Date validation removed - allow any date for rice production entry

    // Determine if entry should be auto-approved (admin or manager)
    const isAdminOrManager = req.user.role === 'admin' || req.user.role === 'manager';
    const entryStatus = isAdminOrManager ? 'approved' : 'pending';

    // Create rice production
    const production = await RiceProduction.create({
      outturnId: finalOutturnId,
      date,
      productType: dbProductType, // Use mapped database value
      quantityQuintals,
      packagingId,
      bags: bagsNum,
      paddyBagsDeducted,
      movementType,
      locationCode: movementType === 'kunchinittu' ? locationCode : null,
      lorryNumber: movementType === 'loading' ? lorryNumber : null,
      billNumber: movementType === 'loading' ? billNumber : null,
      createdBy: req.user.userId,
      status: entryStatus,
      // Auto-approve fields for admin/manager
      approvedBy: isAdminOrManager ? req.user.userId : null,
      approvedAt: isAdminOrManager ? new Date() : null
    });

    console.log(`✅ Rice production created with status: ${entryStatus} (user role: ${req.user.role})`);

    // AUTOMATIC RESYNC: Using the new robust full-resync service
    // This ensures every rice production has a corresponding by-product entry
    // and cleans up any inconsistencies in a single step.
    try {
      await ByProductSyncService.syncOutturn(finalOutturnId, req.user.userId);
    } catch (syncError) {
      console.error('⚠️ By-Product sync failed during creation:', syncError.message);
      // Don't fail the main request, but log it
    }

    // Fetch with associations
    const createdProduction = await RiceProduction.findByPk(production.id, {
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] }
      ]
    });

    res.status(201).json({
      message: 'Rice production entry created successfully (by-product auto-recorded)',
      production: createdProduction
    });
  } catch (error) {
    console.error('Create rice production error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      sql: error.sql || 'N/A'
    });

    // Write error to file for debugging
    const fs = require('fs');
    const errorLog = `
=== Rice Production Error ===
Time: ${new Date().toISOString()}
Message: ${error.message}
Name: ${error.name}
SQL: ${error.sql || 'N/A'}
Stack: ${error.stack}
========================
`;
    fs.appendFileSync('rice-production-errors.log', errorLog);

    res.status(500).json({
      error: 'Failed to create rice production entry',
      details: error.message
    });
  }
});

// Approve rice production (Manager/Admin only)
router.post('/:id/approve', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const production = await RiceProduction.findByPk(req.params.id);

    if (!production) {
      return res.status(404).json({ error: 'Rice production entry not found' });
    }

    if (production.status === 'approved') {
      return res.status(400).json({ error: 'This entry is already approved' });
    }

    await production.update({
      status: 'approved',
      approvedBy: req.user.userId,
      approvedAt: new Date()
    });

    const approvedProduction = await RiceProduction.findByPk(production.id, {
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] }
      ]
    });

    res.json({
      message: 'Rice production entry approved successfully',
      production: approvedProduction
    });
  } catch (error) {
    console.error('Approve rice production error:', error);
    res.status(500).json({ error: 'Failed to approve rice production entry' });
  }
});

// Bulk approve rice productions (Manager/Admin only)
router.post('/bulk-approve', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { productionIds } = req.body;

    if (!productionIds || !Array.isArray(productionIds) || productionIds.length === 0) {
      return res.status(400).json({ error: 'productionIds array is required' });
    }

    const results = { approved: [], failed: [] };

    for (const id of productionIds) {
      try {
        const production = await RiceProduction.findByPk(id);
        if (!production) {
          results.failed.push({ id, reason: 'Not found' });
          continue;
        }
        if (production.status !== 'pending') {
          results.failed.push({ id, reason: 'Not pending' });
          continue;
        }

        await production.update({
          status: 'approved',
          approvedBy: req.user.userId,
          approvedAt: new Date()
        });
        results.approved.push(id);
      } catch (error) {
        results.failed.push({ id, reason: error.message });
      }
    }

    res.json({
      message: `Bulk approval completed: ${results.approved.length} approved, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    console.error('Bulk approve rice productions error:', error);
    res.status(500).json({ error: 'Failed to bulk approve rice productions' });
  }
});

// Bulk reject rice productions (Manager/Admin only)
router.post('/bulk-reject', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { productionIds, remarks } = req.body;

    if (!productionIds || !Array.isArray(productionIds) || productionIds.length === 0) {
      return res.status(400).json({ error: 'productionIds array is required' });
    }

    const results = { rejected: [], failed: [] };

    for (const id of productionIds) {
      try {
        const production = await RiceProduction.findByPk(id);
        if (!production) {
          results.failed.push({ id, reason: 'Not found' });
          continue;
        }
        if (production.status !== 'pending') {
          results.failed.push({ id, reason: 'Not pending' });
          continue;
        }

        await production.update({
          status: 'rejected'
        });
        results.rejected.push(id);
      } catch (error) {
        results.failed.push({ id, reason: error.message });
      }
    }

    res.json({
      message: `Bulk rejection completed: ${results.rejected.length} rejected, ${results.failed.length} failed`,
      results
    });
  } catch (error) {
    console.error('Bulk reject rice productions error:', error);
    res.status(500).json({ error: 'Failed to bulk reject rice productions' });
  }
});

// Update rice production (Manager/Admin only - Staff cannot edit)
router.put('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const production = await RiceProduction.findByPk(req.params.id);

    if (!production) {
      return res.status(404).json({ error: 'Rice production entry not found' });
    }

    // Status check - Admins can bypass the 'approved' block
    if (production.status === 'approved' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Approved production entries cannot be updated by non-admin users' });
    }

    const {
      outturnId,
      date,
      productType,
      bags,
      packagingId,
      movementType,
      locationCode,
      lorryNumber,
      billNumber
    } = req.body;

    // If outturnId is being changed, check if new outurn is cleared
    if (outturnId && outturnId !== production.outturnId) {
      const newOutturn = await Outturn.findByPk(outturnId);
      if (!newOutturn) {
        return res.status(400).json({ error: 'Outturn not found' });
      }

      if (newOutturn.isCleared) {
        return res.status(400).json({
          error: `Cannot update rice production to cleared outurn ${newOutturn.code}. This outurn was cleared on ${new Date(newOutturn.clearedAt).toLocaleDateString()}.`,
          isCleared: true,
          clearedAt: newOutturn.clearedAt
        });
      }
    }

    // Recalculate quintals and paddy bags if bags or packaging changed
    // CRITICAL: Store original values BEFORE any changes for By-Products sync
    const oldOutturnId = production.outturnId;
    const oldQuantityQuintals = parseFloat(production.quantityQuintals) || 0;
    const oldDate = production.date; // Capture old date for By-Products sync
    const oldProductType = production.productType; // Capture old product type too
    let quantityQuintals = oldQuantityQuintals;
    let paddyBagsDeducted = production.paddyBagsDeducted;
    let finalBags = bags !== undefined ? parseFloat(bags) : production.bags;

    if (bags !== undefined || packagingId) {
      const packaging = await Packaging.findByPk(packagingId || production.packagingId);
      if (!packaging) {
        return res.status(400).json({ error: 'Invalid packaging selected' });
      }

      const kgPerBag = parseFloat(packaging.allottedKg);

      // Calculate quintals: (bags × kg_per_bag) / 100
      quantityQuintals = (finalBags * kgPerBag) / 100;

      // Calculate paddy bags deducted using new formula
      paddyBagsDeducted = calculatePaddyBagsDeducted(quantityQuintals, productType || production.productType);

      // Validate available paddy bags (excluding current production's deduction)
      const totalPaddyBags = await Arrival.sum('bags', {
        where: {
          outturnId: production.outturnId,
          movementType: { [Op.in]: ['production-shifting', 'purchase'] }
        }
      }) || 0;

      // Get total paddy bags already DEDUCTED (excluding current production)
      const usedPaddyBagsDeducted = await RiceProduction.sum('paddyBagsDeducted', {
        where: {
          outturnId: production.outturnId,
          status: { [Op.in]: ['pending', 'approved'] },
          id: { [Op.ne]: production.id } // Exclude current production
        }
      }) || 0;

      const availablePaddyBags = totalPaddyBags - usedPaddyBagsDeducted;

      // FIX: Compare deducted bags, not user-entered bags
      if (paddyBagsDeducted > availablePaddyBags) {
        return res.status(400).json({
          error: `Insufficient paddy bags available. Available: ${availablePaddyBags} bags, Required: ${paddyBagsDeducted} bags (for ${finalBags} rice bags)`,
          availablePaddyBags,
          requiredPaddyBags: paddyBagsDeducted
        });
      }
    }

    await production.update({
      date: date || production.date,
      productType: productType || production.productType,
      quantityQuintals,
      packagingId: packagingId || production.packagingId,
      bags: finalBags,
      paddyBagsDeducted,
      movementType: movementType || production.movementType,
      locationCode: movementType === 'kunchinittu' ? locationCode : null,
      lorryNumber: movementType === 'loading' ? lorryNumber : null,
      billNumber: movementType === 'loading' ? billNumber : null
    });

    const updatedProduction = await RiceProduction.findByPk(production.id, {
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: Packaging, as: 'packaging', attributes: ['brandName', 'code', 'allottedKg'] },
        { model: User, as: 'creator', attributes: ['username', 'role'] }
      ]
    });

    // AUTOMATIC RESYNC: Clear and rebuild the By-Products table for this outturn
    // This handles date changes, outturn changes, and quantity changes is a 100% robust way.
    try {
      const newOutturnId = outturnId || production.outturnId;

      // If the outturn itself was changed, we must resync BOTH outturns
      if (oldOutturnId !== newOutturnId) {
        console.log(`📊 Outturn changed from ${oldOutturnId} to ${newOutturnId}. Resyncing both...`);
        await ByProductSyncService.syncOutturn(oldOutturnId, req.user.userId);
        await ByProductSyncService.syncOutturn(newOutturnId, req.user.userId);
      } else {
        // Just resync the current outturn
        await ByProductSyncService.syncOutturn(newOutturnId, req.user.userId);
      }
    } catch (syncError) {
      console.error('⚠️ By-Product resync failed during update:', syncError.message);
      // Don't fail the main request - just log it
    }

    // CRITICAL: Clear all related caches to ensure fresh data on refresh
    try {
      const cacheService = require('../services/cacheService');
      await cacheService.delPattern('rice*');
      await cacheService.delPattern('production*');
      await cacheService.delPattern('byProduct*');
      await cacheService.delPattern('outturn*');
      console.log('✅ All related caches cleared after update');
    } catch (cacheError) {
      console.warn('⚠️ Failed to clear cache:', cacheError.message);
    }

    res.json({
      message: 'Rice production entry updated successfully',
      production: updatedProduction
    });
  } catch (error) {
    console.error('Update rice production error:', error);
    res.status(500).json({ error: 'Failed to update rice production entry' });
  }
});

// Delete rice production (Manager/Admin only - Staff cannot delete)
router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const production = await RiceProduction.findByPk(req.params.id);

    if (!production) {
      return res.status(404).json({ error: 'Rice production entry not found' });
    }

    // Cannot delete approved entries unless admin
    if (production.status === 'approved' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Only admins can delete approved entries' });
    }

    const targetOutturnId = production.outturnId;
    await production.destroy();

    // AUTOMATIC RESYNC: Clean up by-products table after deletion
    try {
      await ByProductSyncService.syncOutturn(targetOutturnId, req.user.userId);
    } catch (syncError) {
      console.error('⚠️ By-Product resync failed during deletion:', syncError.message);
    }

    res.json({ message: 'Rice production entry deleted successfully' });
  } catch (error) {
    console.error('Delete rice production error:', error);
    res.status(500).json({ error: 'Failed to delete rice production entry' });
  }
});

module.exports = router;
