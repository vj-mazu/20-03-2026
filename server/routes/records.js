const express = require('express');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const Arrival = require('../models/Arrival');
const { Warehouse, Kunchinittu, Variety } = require('../models/Location');
const User = require('../models/User');
const Outturn = require('../models/Outturn');
const PurchaseRate = require('../models/PurchaseRate');
const cacheService = require('../services/cacheService');

const router = express.Router();

// Get day-wise arrivals with month-wise pagination
router.get('/arrivals', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      month, // Format: YYYY-MM
      dateFrom,
      dateTo,
      status,
      movementType,
      outturnId,
      limit,
      showAll // NEW: When true, bypass 30-day limit for stock tab
    } = req.query;

    // PERFORMANCE: Create cache key from all query params  
    const cacheKey = `records_arrivals:${month || ''}:${dateFrom || ''}:${dateTo || ''}:${status || ''}:${movementType || ''}:${outturnId || ''}:${limit || ''}:${showAll || ''}:${req.user.role}`;

    // Try cache first (60 second TTL for performance)
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      const responseTime = Date.now() - startTime;
      console.log(`⚡ Arrivals cache HIT: ${responseTime}ms`);
      return res.json({
        ...cachedData,
        performance: { responseTime: `${responseTime}ms`, cached: true }
      });
    }


    const where = {};

    // Filter by movement type if provided
    if (movementType) {
      where.movementType = movementType;
    }

    // Filter by outturn if provided
    if (outturnId) {
      where.outturnId = outturnId;
    }

    // Filter by status if provided
    if (status) {
      where.status = status;
    } else if (req.user.role === 'staff') {
      // Staff sees their own entries + approved entries
      where[Op.or] = [
        { createdBy: req.user.userId },
        { status: 'approved' }
      ];
    }

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
      console.log(`📅 Arrivals month filter: ${startDate} to ${endDate}`);
    }

    // 2. Date Range filtering
    if (dateFrom || dateTo) {
      const rangeCondition = {};
      if (dateFrom) rangeCondition[Op.gte] = dateFrom;
      if (dateTo) rangeCondition[Op.lte] = dateTo;
      dateConditions.push(rangeCondition);
      console.log(`📅 Arrivals range filter: ${dateFrom} to ${dateTo}`);
    }

    // 3. Search functionality
    const { search } = req.query;
    if (search) {
      const searchPattern = `%${search}%`;
      where[Op.or] = [
        { slNo: { [Op.iLike]: searchPattern } },
        { wbNo: { [Op.iLike]: searchPattern } },
        { lorryNumber: { [Op.iLike]: searchPattern } },
        { broker: { [Op.iLike]: searchPattern } },
        { variety: { [Op.iLike]: searchPattern } },
        { fromLocation: { [Op.iLike]: searchPattern } }
      ];
      console.log(`🔍 Arrivals search applied: ${search}`);
    }

    // Combine conditions if multiple exist
    if (dateConditions.length > 0) {
      if (dateConditions.length === 1) {
        where.date = dateConditions[0];
      } else {
        where.date = { [Op.and]: dateConditions };
      }
    } else if (!outturnId && showAll !== 'true' && !search) {
      // DEFAULT: Default to last 30 days if NO filters provided (limit performance impact)
      // Only apply if NO search is provided
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.date = {
        [Op.gte]: thirtyDaysAgo.toISOString().split('T')[0]
      };
      console.log(`📅 Default 30-day filter applied`);
    } else if (showAll === 'true' || search) {
      console.log(`📅 showAll=true or search provided: Skipping default date limit`);
    }

    // Safety limit: Default to 500 if no limit provided, max 1000 (reduced from 5000 for better performance)
    const limitNum = limit ? Math.min(parseInt(limit), 1000) : 500;

    const rows = await Arrival.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] },
        { model: User, as: 'adminApprover', attributes: ['username', 'role'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'averageRate'], required: false },
        { model: PurchaseRate, as: 'purchaseRate', attributes: ['amountFormula', 'totalAmount', 'averageRate'], required: false }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limitNum
    });

    // Group by date
    const groupedByDate = rows.reduce((acc, arrival) => {
      const date = arrival.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(arrival);
      return acc;
    }, {});

    // FIXED: Parameterized query to prevent SQL injection (was using string interpolation)
    const monthConditions = [];
    const monthReplacements = {};
    if (movementType) {
      monthConditions.push('"movementType" = :movementType');
      monthReplacements.movementType = movementType;
    }
    if (status) {
      monthConditions.push('status = :status');
      monthReplacements.status = status;
    }
    const monthWhereClause = monthConditions.length > 0
      ? 'WHERE ' + monthConditions.join(' AND ')
      : '';

    const monthsQuery = await sequelize.query(`
      SELECT DISTINCT 
        TO_CHAR(date, 'YYYY-MM') as month,
        TO_CHAR(date, 'Month YYYY') as month_label
      FROM arrivals
      ${monthWhereClause}
      ORDER BY month DESC
    `, { replacements: monthReplacements });

    const availableMonths = monthsQuery[0];

    const responseTime = Date.now() - startTime;
    console.log(`✅ Arrivals query completed in ${responseTime}ms: ${rows.length} records returned`);

    const responseData = {
      records: groupedByDate,
      pagination: {
        currentMonth: month || null,
        availableMonths: availableMonths,
        totalRecords: rows.length,
        limit: limitNum,
        truncated: rows.length === limitNum
      }
    };

    // Cache for 60 seconds (ultra-fast subsequent requests)
    await cacheService.set(cacheKey, responseData, 60);

    res.json({
      ...responseData,
      performance: { responseTime: `${responseTime}ms`, cached: false }
    });
  } catch (error) {
    console.error('Get arrivals records error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    // Return error with details for debugging in cloud
    res.status(500).json({
      error: 'Failed to fetch arrivals',
      message: error.message,
      records: {},
      pagination: {
        currentMonth: null,
        availableMonths: [],
        totalRecords: 0
      }
    });
  }
});

// Get purchase records with month-wise pagination
router.get('/purchase', auth, async (req, res) => {
  const startTime = Date.now();
  try {
    const {
      month, // Format: YYYY-MM
      dateFrom,
      dateTo,
      page,
      limit,
      search
    } = req.query;

    // PERFORMANCE: Create cache key from all query params
    const cacheKey = `records_purchase:${month || ''}:${dateFrom || ''}:${dateTo || ''}:${page || '1'}:${limit || ''}:${search || ''}`;

    // Try cache first (60 second TTL for performance)
    const cachedData = await cacheService.get(cacheKey);
    if (cachedData) {
      const responseTime = Date.now() - startTime;
      console.log(`⚡ Purchase cache HIT: ${responseTime}ms`);
      return res.json({
        ...cachedData,
        performance: { responseTime: `${responseTime}ms`, cached: true }
      });
    }

    const where = {
      movementType: 'purchase',
      status: 'approved'
    };

    // Search functionality
    if (search) {
      const searchPattern = `%${search}%`;
      where[Op.or] = [
        { slNo: { [Op.iLike]: searchPattern } },
        { wbNo: { [Op.iLike]: searchPattern } },
        { lorryNumber: { [Op.iLike]: searchPattern } },
        { broker: { [Op.iLike]: searchPattern } },
        { variety: { [Op.iLike]: searchPattern } }
      ];
      console.log(`🔍 Purchase search applied: ${search}`);
    }

    // FIXED: Improved date filtering logic with proper month boundary handling
    if (dateFrom || dateTo) {
      // Date Range filtering takes priority over Month-wise filtering
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    } else if (month) {
      // FIXED: Proper month boundary calculation
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`;
      // FIXED: Calculate last day of month properly
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const endDate = `${year}-${monthNum.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      where.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
      console.log(`📅 Purchase month filter applied: ${startDate} to ${endDate}`);
    }

    // Pagination setup
    const queryOptions = {
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] },
        { model: User, as: 'adminApprover', attributes: ['username', 'role'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'], required: false },
        {
          model: PurchaseRate,
          as: 'purchaseRate',
          attributes: ['amountFormula', 'totalAmount', 'averageRate'],
          required: false
        }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    };

    // Enhanced pagination: Support up to 10,000 records per page
    const pageNum = parseInt(page) || 1;
    const limitNum = limit ? Math.min(parseInt(limit), 10000) : 250;
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await Arrival.count({ where });

    queryOptions.limit = limitNum;
    queryOptions.offset = offset;

    const rows = await Arrival.findAll(queryOptions);

    // Group by date
    const groupedByDate = rows.reduce((acc, arrival) => {
      const date = arrival.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(arrival);
      return acc;
    }, {});

    // FIXED: Improved available months query
    const monthsQuery = await sequelize.query(`
      SELECT DISTINCT 
        TO_CHAR(date, 'YYYY-MM') as month,
        TO_CHAR(date, 'Month YYYY') as month_label
      FROM arrivals
      WHERE "movementType" = 'purchase' AND status = 'approved'
      ORDER BY month DESC
    `);

    const totalPages = Math.ceil(totalCount / limitNum);

    const responseTime = Date.now() - startTime;
    console.log(`✅ Purchase query completed in ${responseTime}ms: ${rows.length} records returned`);

    const responseData = {
      records: groupedByDate,
      pagination: {
        currentMonth: month || null,
        availableMonths: monthsQuery[0],
        totalRecords: totalCount,
        recordsReturned: rows.length,
        limit: limitNum,
        page: pageNum,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        truncated: false
      }
    };

    // Cache for 60 seconds (ultra-fast subsequent requests)
    await cacheService.set(cacheKey, responseData, 60);

    res.json({
      ...responseData,
      performance: { responseTime: `${responseTime}ms`, cached: false }
    });
  } catch (error) {
    console.error('Get purchase records error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({
      error: 'Failed to fetch purchase records',
      message: error.message,
      query: req.query
    });
  }
});

// Get shifting records with month-wise pagination
router.get('/shifting', auth, async (req, res) => {
  try {
    const {
      month, // Format: YYYY-MM
      dateFrom,
      dateTo,
      page,
      limit,
      search
    } = req.query;

    const where = {
      movementType: { [Op.in]: ['shifting', 'production-shifting', 'for-production'] },
      status: 'approved'
    };

    // Search functionality
    if (search) {
      const searchPattern = `%${search}%`;
      where[Op.or] = [
        { slNo: { [Op.iLike]: searchPattern } },
        { wbNo: { [Op.iLike]: searchPattern } },
        { lorryNumber: { [Op.iLike]: searchPattern } },
        { variety: { [Op.iLike]: searchPattern } }
      ];
      console.log(`🔍 Shifting search applied: ${search}`);
    }

    // FIXED: Improved date filtering logic with proper month boundary handling
    if (dateFrom || dateTo) {
      // Date Range filtering takes priority over Month-wise filtering
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    } else if (month) {
      // FIXED: Proper month boundary calculation
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`;
      // FIXED: Calculate last day of month properly
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const endDate = `${year}-${monthNum.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      where.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
      console.log(`📅 Shifting month filter applied: ${startDate} to ${endDate}`);
    }

    // Pagination setup
    const queryOptions = {
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] },
        { model: User, as: 'adminApprover', attributes: ['username', 'role'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] },
        { model: PurchaseRate, as: 'purchaseRate', attributes: ['amountFormula', 'totalAmount', 'averageRate'], required: false }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    };

    // Enhanced pagination: Support up to 10,000 records per page
    const pageNum = parseInt(page) || 1;
    const limitNum = limit ? Math.min(parseInt(limit), 10000) : 250;
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await Arrival.count({ where });

    queryOptions.limit = limitNum;
    queryOptions.offset = offset;

    const rows = await Arrival.findAll(queryOptions);

    // Group by date
    const groupedByDate = rows.reduce((acc, arrival) => {
      const date = arrival.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(arrival);
      return acc;
    }, {});

    // FIXED: Improved available months query
    const monthsQuery = await sequelize.query(`
      SELECT DISTINCT 
        TO_CHAR(date, 'YYYY-MM') as month,
        TO_CHAR(date, 'Month YYYY') as month_label
      FROM arrivals
      WHERE "movementType" IN ('shifting', 'production-shifting', 'for-production') AND status = 'approved'
      ORDER BY month DESC
    `);

    const totalPages = Math.ceil(totalCount / limitNum);

    console.log(`✅ Shifting query completed: ${rows.length} records returned`);

    res.json({
      records: groupedByDate,
      pagination: {
        currentMonth: month || null,
        availableMonths: monthsQuery[0],
        totalRecords: totalCount,
        recordsReturned: rows.length,
        limit: limitNum,
        page: pageNum,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        truncated: false
      }
    });
  } catch (error) {
    console.error('Get shifting records error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({
      error: 'Failed to fetch shifting records',
      message: error.message,
      query: req.query
    });
  }
});

// Get paddy stock - OPTIMIZED with CACHING and month-wise pagination
router.get('/stock', auth, async (req, res) => {
  const startTime = Date.now();

  try {
    const {
      month, // Format: YYYY-MM
      dateFrom,
      dateTo,
      limit,
      showAll,
      status,
      page,
      search
    } = req.query;

    // SAFE CACHING: Create cache key based on query params
    const cacheKey = `stock:${month || ''}:${dateFrom || ''}:${dateTo || ''}:${limit || ''}:${showAll || ''}:${status || ''}:${page || '1'}:${search || ''}`;

    // Try cache first (safe - won't crash on error)
    try {
      const cachedData = await cacheService.get(cacheKey);
      if (cachedData) {
        const responseTime = Date.now() - startTime;
        return res.json({
          ...cachedData,
          performance: { responseTime: `${responseTime}ms`, cached: true }
        });
      }
    } catch (cacheError) {
      console.warn('Cache read failed (safe fallback):', cacheError.message);
      // Continue without cache - don't crash
    }

    const where = {
      status: 'approved'
      // Removing strict adminApprovedBy requirement for stock view consistency
      // as users need to see cumulative stock from all approved records.
      // NOTE: Loose entries are now INCLUDED to show as deductions in Paddy Stock
      // They will be displayed with Kunchinittu name and deducted from stock
    };

    // Search functionality
    if (search) {
      const searchPattern = `%${search}%`;
      where[Op.or] = [
        { slNo: { [Op.iLike]: searchPattern } },
        { wbNo: { [Op.iLike]: searchPattern } },
        { lorryNumber: { [Op.iLike]: searchPattern } },
        { broker: { [Op.iLike]: searchPattern } },
        { variety: { [Op.iLike]: searchPattern } }
      ];
      console.log(`🔍 Stock search applied: ${search}`);
    }

    // FIXED: Improved date filtering logic with proper month boundary handling
    if (dateFrom || dateTo) {
      // Date Range filtering takes priority over Month-wise filtering
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    } else if (month) {
      // FIXED: Proper month boundary calculation
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`;
      // FIXED: Calculate last day of month properly
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const endDate = `${year}-${monthNum.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      where.date = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
      console.log(`📅 Month filter applied: ${startDate} to ${endDate}`);
    }
    // If no date filters provided, show all data (no default filter)

    // OPTIMIZATION: Only select needed attributes
    // Enhanced pagination: Support up to 10,000 records per page for large datasets
    // Default to 250 for performance, but allow up to 10,000 for comprehensive views
    const limitNum = limit ? Math.min(parseInt(limit), 10000) : 250;

    // Add pagination support with offset
    const pageNum = parseInt(page) || 1;
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await Arrival.count({ where });

    const rows = await Arrival.findAll({
      where,
      attributes: [
        'id', 'date', 'bags', 'netWeight', 'variety', 'movementType',
        'wbNo', 'lorryNumber', 'broker', 'fromLocation', 'outturnId', 'createdAt'
      ],
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: User, as: 'approver', attributes: ['username'] },
        { model: User, as: 'adminApprover', attributes: ['username'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'isCleared', 'clearedAt'], required: false },
        { model: PurchaseRate, as: 'purchaseRate', attributes: ['amountFormula', 'totalAmount', 'averageRate'], required: false }
      ],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limitNum,
      offset: offset
    });

    // FIXED: Improved cleared outturn filtering logic
    const filteredRows = rows.filter(arrival => {
      // If arrival has an outturn and it's cleared
      if (arrival.outturn && arrival.outturn.isCleared && arrival.outturn.clearedAt) {
        // Get the clearing date (just the date part, not time)
        const clearedDate = new Date(arrival.outturn.clearedAt).toISOString().split('T')[0];
        const arrivalDate = arrival.date;

        // Only exclude if arrival date is AFTER the clearing date
        // Keep arrivals from before and on the clearing date
        if (arrivalDate > clearedDate) {
          console.log(`🚫 Excluding arrival ${arrival.id} from ${arrivalDate} (outturn ${arrival.outturn.code} cleared on ${clearedDate})`);
          return false; // Exclude from stock
        }
      }
      return true; // Keep in stock
    });

    // Group by date
    const groupedByDate = filteredRows.reduce((acc, arrival) => {
      const date = arrival.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(arrival);
      return acc;
    }, {});

    // FIXED: Optimized available months query with caching
    const availableMonths = await cacheService.getOrSet('stock_available_months', async () => {
      const result = await sequelize.query(`
        SELECT DISTINCT 
          TO_CHAR(date, 'YYYY-MM') as month,
          TO_CHAR(date, 'Month YYYY') as month_label
        FROM arrivals
        WHERE status = 'approved' 
          AND "adminApprovedBy" IS NOT NULL
        ORDER BY month DESC
      `);
      return result[0];
    }, 3600); // Cache for 1 hour

    // Fetch closed kunchinittus with remaining bags for stock deduction
    const closedWhere = {
      isClosed: true,
      closedRemainingBags: { [Op.gt]: 0 } // Only those with remaining bags
    };

    // Filter closed kunchinittus by date range if provided
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = `${year}-${monthNum.padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
      const endDate = `${year}-${monthNum.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      closedWhere.closedAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else if (dateFrom || dateTo) {
      closedWhere.closedAt = {};
      if (dateFrom) closedWhere.closedAt[Op.gte] = new Date(dateFrom);
      if (dateTo) closedWhere.closedAt[Op.lte] = new Date(dateTo);
      if (Object.keys(closedWhere.closedAt).length === 0) delete closedWhere.closedAt;
    }

    const filteredClosedKunchinittus = await Kunchinittu.findAll({
      where: closedWhere,
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['name', 'code'] },
        { model: Variety, as: 'variety', attributes: ['name'] }
      ],
      attributes: ['id', 'name', 'code', 'closedAt', 'closedRemainingBags'],
      order: [['closedAt', 'DESC']]
    });

    const responseTime = Date.now() - startTime;
    const totalPages = Math.ceil(totalCount / limitNum);

    console.log(`✅ Stock query completed in ${responseTime}ms: ${filteredRows.length} records, ${filteredClosedKunchinittus.length} closed kunchinittus`);

    const responseData = {
      records: groupedByDate,
      closedKunchinittus: filteredClosedKunchinittus.map(kn => ({
        id: kn.id,
        code: kn.code,
        name: kn.name,
        variety: kn.variety?.name || 'Unknown',
        warehouse: kn.warehouse?.name || '',
        warehouseCode: kn.warehouse?.code || '',
        closedAt: kn.closedAt,
        closedDate: kn.closedAt ? kn.closedAt.toISOString().split('T')[0] : null,
        closedRemainingBags: kn.closedRemainingBags || 0
      })),
      pagination: {
        currentMonth: month || null,
        availableMonths: availableMonths,
        totalRecords: totalCount,
        recordsReturned: filteredRows.length,
        limit: limitNum,
        page: pageNum,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        truncated: false // No longer truncating, using proper pagination
      },
      performance: {
        responseTime: `${responseTime}ms`,
        recordsReturned: filteredRows.length
      }
    };

    // SAFE CACHE SET (won't crash on error)
    try {
      await cacheService.set(cacheKey, responseData, 30); // 30 second cache
    } catch (cacheError) {
      console.warn('Cache write failed (safe fallback):', cacheError.message);
    }

    res.json(responseData);
  } catch (error) {
    console.error('Get stock error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      query: req.query
    });
    res.status(500).json({
      error: 'Failed to fetch stock data',
      message: error.message,
      query: req.query
    });
  }
});

// Update arrival (Manager/Admin only)
router.put('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const arrival = await Arrival.findByPk(req.params.id);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }

    await arrival.update(req.body);

    const updatedArrival = await Arrival.findByPk(arrival.id, {
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'approver', attributes: ['username', 'role'] },
        { model: User, as: 'adminApprover', attributes: ['username', 'role'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] }
      ]
    });

    res.json({
      message: 'Arrival updated successfully',
      arrival: updatedArrival
    });
  } catch (error) {
    console.error('Update arrival error:', error);
    res.status(500).json({ error: 'Failed to update arrival' });
  }
});

// Delete arrival (Manager/Admin only)
router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const arrival = await Arrival.findByPk(req.params.id);
    if (!arrival) {
      return res.status(404).json({ error: 'Arrival not found' });
    }

    await arrival.destroy();

    res.json({ message: 'Arrival deleted successfully' });
  } catch (error) {
    console.error('Delete arrival error:', error);
    res.status(500).json({ error: 'Failed to delete arrival' });
  }
});

module.exports = router;
