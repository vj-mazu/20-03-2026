const { sequelize } = require('../config/database');
const { Op, QueryTypes } = require('sequelize');
const Arrival = require('../models/Arrival');
const { Warehouse, Kunchinittu } = require('../models/Location');
const User = require('../models/User');
const Outturn = require('../models/Outturn');

/**
 * Query Optimization Service
 * 
 * Provides optimized, reusable queries for common operations
 * Uses raw SQL with CTEs and aggregations for performance
 */
class QueryOptimizationService {

  /**
   * Get stock by variety using optimized raw SQL with CTEs
   * @param {string} variety - Variety name
   * @param {Object} options - Additional options (dateFrom, dateTo)
   * @returns {Promise<Array>} Stock locations with bags
   */
  async getStockByVariety(variety, options = {}) {
    const { dateFrom, dateTo } = options;
    const normalizedVariety = variety.trim().toUpperCase();

    let dateFilter = '';
    if (dateFrom || dateTo) {
      dateFilter = 'AND (';
      if (dateFrom) dateFilter += `a.date >= '${dateFrom}'`;
      if (dateFrom && dateTo) dateFilter += ' AND ';
      if (dateTo) dateFilter += `a.date <= '${dateTo}'`;
      dateFilter += ')';
    }

    const stockLocations = await sequelize.query(`
      WITH inward_stock AS (
        SELECT 
          a."toKunchinintuId" as "kunchinintuId",
          COALESCE(a."toWarehouseId", a."toWarehouseShiftId") as "warehouseId",
          SUM(COALESCE(a.bags, 0)) as "inwardBags"
        FROM arrivals a
        WHERE UPPER(TRIM(a.variety)) = :variety
          AND a."movementType" IN ('purchase', 'shifting', 'loose')
          AND a.status = 'approved'
          AND a."adminApprovedBy" IS NOT NULL
          AND a."toKunchinintuId" IS NOT NULL
          ${dateFilter}
        GROUP BY a."toKunchinintuId", COALESCE(a."toWarehouseId", a."toWarehouseShiftId")
      ),
      outward_stock AS (
        SELECT 
          a."fromKunchinintuId" as "kunchinintuId",
          a."fromWarehouseId" as "warehouseId",
          SUM(COALESCE(a.bags, 0)) as "outwardBags"
        FROM arrivals a
        WHERE UPPER(TRIM(a.variety)) = :variety
          AND a."movementType" IN ('shifting', 'production-shifting')
          AND a.status = 'approved'
          AND a."adminApprovedBy" IS NOT NULL
          AND a."fromKunchinintuId" IS NOT NULL
          ${dateFilter}
        GROUP BY a."fromKunchinintuId", a."fromWarehouseId"
      )
      SELECT 
        COALESCE(i."kunchinintuId", o."kunchinintuId") as "kunchinintuId",
        COALESCE(i."warehouseId", o."warehouseId") as "warehouseId",
        (COALESCE(i."inwardBags", 0) - COALESCE(o."outwardBags", 0)) as "stockBags",
        k.code as "kunchinintuCode",
        k.name as "kunchinintuName",
        w.code as "warehouseCode",
        w.name as "warehouseName"
      FROM inward_stock i
      FULL OUTER JOIN outward_stock o 
        ON i."kunchinintuId" = o."kunchinintuId" 
        AND i."warehouseId" = o."warehouseId"
      LEFT JOIN kunchinittus k ON COALESCE(i."kunchinintuId", o."kunchinintuId") = k.id
      LEFT JOIN warehouses w ON COALESCE(i."warehouseId", o."warehouseId") = w.id
      WHERE (COALESCE(i."inwardBags", 0) - COALESCE(o."outwardBags", 0)) > 0
        AND k.is_closed = false
      ORDER BY "stockBags" DESC
    `, {
      replacements: { variety: normalizedVariety },
      type: QueryTypes.SELECT
    });

    return stockLocations || [];
  }

  /**
   * Get stock by kunchinittu using optimized aggregation
   * @param {number} kunchinintuId - Kunchinittu ID
   * @param {Object} options - Additional options (dateFrom, dateTo)
   * @returns {Promise<Object>} Stock summary with inward, outward, remaining
   */
  async getStockByKunchinittu(kunchinintuId, options = {}) {
    const { dateFrom, dateTo } = options;

    let dateFilter = '';
    const replacements = { kunchinintuId };

    if (dateFrom || dateTo) {
      dateFilter = 'AND (';
      if (dateFrom) {
        dateFilter += 'date >= :dateFrom';
        replacements.dateFrom = dateFrom;
      }
      if (dateFrom && dateTo) dateFilter += ' AND ';
      if (dateTo) {
        dateFilter += 'date <= :dateTo';
        replacements.dateTo = dateTo;
      }
      dateFilter += ')';
    }

    const [result] = await sequelize.query(`
      WITH inward AS (
        SELECT 
          SUM(bags) as total_bags,
          SUM("netWeight") as total_weight
        FROM arrivals
        WHERE "toKunchinintuId" = :kunchinintuId
          AND "movementType" IN ('purchase', 'shifting', 'loose')
          AND status = 'approved'
          AND "adminApprovedBy" IS NOT NULL
          ${dateFilter}
      ),
      outward AS (
        SELECT 
          SUM(bags) as total_bags,
          SUM("netWeight") as total_weight
        FROM arrivals
        WHERE "fromKunchinintuId" = :kunchinintuId
          AND "movementType" IN ('shifting', 'production-shifting')
          AND status = 'approved'
          AND "adminApprovedBy" IS NOT NULL
          ${dateFilter}
      )
      SELECT 
        COALESCE(i.total_bags, 0) as inward_bags,
        COALESCE(i.total_weight, 0) as inward_weight,
        COALESCE(o.total_bags, 0) as outward_bags,
        COALESCE(o.total_weight, 0) as outward_weight,
        (COALESCE(i.total_bags, 0) - COALESCE(o.total_bags, 0)) as remaining_bags,
        (COALESCE(i.total_weight, 0) - COALESCE(o.total_weight, 0)) as remaining_weight
      FROM inward i, outward o
    `, {
      replacements,
      type: QueryTypes.SELECT
    });

    return result[0] || {
      inward_bags: 0,
      inward_weight: 0,
      outward_bags: 0,
      outward_weight: 0,
      remaining_bags: 0,
      remaining_weight: 0
    };
  }

  /**
   * Get dashboard statistics using optimized raw SQL
   * @param {string} businessDate - Business date in YYYY-MM-DD format
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats(businessDate) {
    // Get today's arrivals count
    const todayArrivals = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM arrivals
      WHERE date = :businessDate
        AND status IN ('pending', 'approved')
    `, {
      replacements: { businessDate },
      type: QueryTypes.SELECT
    });

    // Get pending approvals count
    const pendingApprovals = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM arrivals
      WHERE status = 'pending'
    `, {
      type: QueryTypes.SELECT
    });

    // Get total stock using optimized aggregation
    const stockData = await sequelize.query(`
      WITH stock_summary AS (
        SELECT 
          "toKunchinintuId" as kunchinittu_id,
          SUM("netWeight") as inward_weight
        FROM arrivals
        WHERE status = 'approved'
          AND "adminApprovedBy" IS NOT NULL
          AND "toKunchinintuId" IS NOT NULL
          AND "movementType" IN ('purchase', 'shifting', 'loose')
        GROUP BY "toKunchinintuId"
      ),
      outward_summary AS (
        SELECT 
          "fromKunchinintuId" as kunchinittu_id,
          SUM("netWeight") as outward_weight
        FROM arrivals
        WHERE status = 'approved'
          AND "adminApprovedBy" IS NOT NULL
          AND "fromKunchinintuId" IS NOT NULL
          AND "movementType" IN ('shifting', 'production-shifting')
        GROUP BY "fromKunchinintuId"
      )
      SELECT 
        SUM(GREATEST(
          COALESCE(s.inward_weight, 0) - COALESCE(o.outward_weight, 0),
          0
        )) as total_stock
      FROM stock_summary s
      FULL OUTER JOIN outward_summary o ON s.kunchinittu_id = o.kunchinittu_id
    `, {
      type: QueryTypes.SELECT
    });

    // Get active warehouses and kunchinittus count
    const locationCounts = await sequelize.query(`
      SELECT 
        (SELECT COUNT(*) FROM warehouses WHERE "isActive" = true) as active_warehouses,
        (SELECT COUNT(*) FROM kunchinittus WHERE "isActive" = true) as active_kunchinittus
    `, {
      type: QueryTypes.SELECT
    });

    // Get total approved records count
    const totalRecords = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM arrivals
      WHERE status = 'approved'
    `, {
      type: QueryTypes.SELECT
    });

    return {
      todayArrivals: parseInt(todayArrivals[0].count),
      pendingApprovals: parseInt(pendingApprovals[0].count),
      totalStock: Math.round(parseFloat(stockData[0].total_stock || 0)),
      activeWarehouses: parseInt(locationCounts[0].active_warehouses),
      activeKunchinittus: parseInt(locationCounts[0].active_kunchinittus),
      totalApprovedRecords: parseInt(totalRecords[0].count)
    };
  }

  /**
   * Get arrivals with pagination using optimized query
   * @param {Object} filters - Filter criteria
   * @param {number} page - Page number
   * @param {number} limit - Records per page
   * @returns {Promise<Object>} Paginated arrivals with count
   */
  async getArrivalsWithPagination(filters = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (filters.movementType) where.movementType = filters.movementType;
    if (filters.status) where.status = filters.status;
    if (filters.createdBy) where.createdBy = filters.createdBy;
    if (filters.outturnId) where.outturnId = filters.outturnId;

    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date[Op.gte] = filters.dateFrom;
      if (filters.dateTo) where.date[Op.lte] = filters.dateTo;
    }

    if (filters.search) {
      where[Op.or] = [
        { slNo: { [Op.iLike]: `%${filters.search}%` } },
        { wbNo: { [Op.iLike]: `%${filters.search}%` } },
        { lorryNumber: { [Op.iLike]: `%${filters.search}%` } },
        { broker: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    // Optimize: Only count on first page
    const countPromise = page === 1
      ? Arrival.count({ where })
      : Promise.resolve(null);

    // Optimized query with eager loading and no subQuery
    const rowsPromise = Arrival.findAll({
      where,
      attributes: [
        'id', 'slNo', 'date', 'movementType', 'broker', 'variety', 'bags',
        'fromLocation', 'moisture', 'cutting', 'wbNo', 'grossWeight',
        'tareWeight', 'netWeight', 'lorryNumber', 'status', 'remarks'
      ],
      include: [
        { model: User, as: 'creator', attributes: ['username'], required: false },
        { model: User, as: 'approver', attributes: ['username'], required: false },
        { model: User, as: 'adminApprover', attributes: ['username'], required: false },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'], required: false },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'], required: false },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'], required: false },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'], required: false },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'], required: false },
        { model: Outturn, as: 'outturn', attributes: ['code', 'id'], required: false }
      ],
      order: [['date', 'DESC'], ['id', 'DESC']], // Use indexed columns
      limit: parseInt(limit),
      offset,
      subQuery: false, // Prevent N+1 queries
      raw: false,
      nest: true
    });

    const [count, rows] = await Promise.all([countPromise, rowsPromise]);

    return {
      arrivals: rows,
      pagination: {
        total: count || rows.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: count ? Math.ceil(count / limit) : 1
      }
    };
  }

  /**
   * Bulk approve arrivals using batch update in transaction
   * @param {Array<number>} arrivalIds - Array of arrival IDs to approve
   * @param {number} userId - User ID performing the approval
   * @param {string} role - User role (manager or admin)
   * @returns {Promise<Object>} Results with approved and failed IDs
   */
  async bulkApproveArrivals(arrivalIds, userId, role) {
    const transaction = await sequelize.transaction();
    const results = {
      approved: [],
      failed: []
    };

    try {
      // Batch size for processing
      const batchSize = 100;

      for (let i = 0; i < arrivalIds.length; i += batchSize) {
        const batch = arrivalIds.slice(i, i + batchSize);

        // Get arrivals in this batch
        const arrivals = await Arrival.findAll({
          where: { id: { [Op.in]: batch } },
          transaction
        });

        for (const arrival of arrivals) {
          try {
            // Manager approval
            if (role === 'manager') {
              if (arrival.status !== 'pending') {
                results.failed.push({ id: arrival.id, reason: 'Already approved or not pending' });
                continue;
              }

              await arrival.update({
                status: 'approved',
                approvedBy: userId,
                approvedAt: new Date()
              }, { transaction });

              results.approved.push(arrival.id);
            }
            // Admin approval
            else if (role === 'admin') {
              if (arrival.status === 'pending') {
                // Auto-approve as manager too
                await arrival.update({
                  status: 'approved',
                  approvedBy: userId,
                  approvedAt: new Date(),
                  adminApprovedBy: userId,
                  adminApprovedAt: new Date()
                }, { transaction });
              } else if (arrival.status === 'approved' && !arrival.adminApprovedBy) {
                // Just admin approve
                await arrival.update({
                  adminApprovedBy: userId,
                  adminApprovedAt: new Date()
                }, { transaction });
              } else {
                results.failed.push({ id: arrival.id, reason: 'Already fully approved' });
                continue;
              }

              results.approved.push(arrival.id);
            }
          } catch (error) {
            results.failed.push({ id: arrival.id, reason: error.message });
          }
        }
      }

      await transaction.commit();
      return results;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new QueryOptimizationService();
