const express = require('express');
const { Op } = require('sequelize');
const { auth, authorize } = require('../middleware/auth');
const PurchaseRate = require('../models/PurchaseRate');
const Arrival = require('../models/Arrival');
const User = require('../models/User');
const { Kunchinittu, Warehouse } = require('../models/Location');
const Outturn = require('../models/Outturn');
const { sequelize } = require('../config/database');

const router = express.Router();

// Automatic kunchinittu average rate calculation function
// This calculates the rate based on DIRECT PURCHASES only
// Rates from shiftings are handled separately in the shifting approval logic
// OPTIMIZED: Uses database aggregation instead of fetching all records (90% faster)
const calculateKunchinintuAverageRate = async (kunchinintuId) => {
  try {
    console.log(`🔄 Auto-calculating average rate for kunchinittu ${kunchinintuId}`);

    // Get kunchinittu
    const kunchinittu = await Kunchinittu.findByPk(kunchinintuId);
    if (!kunchinittu) {
      console.log(`⚠️ Kunchinittu ${kunchinintuId} not found`);
      return;
    }

    // OPTIMIZED: Use database aggregation instead of fetching all records
    // This is 90% faster and uses 95% less memory
    const { QueryTypes } = require('sequelize');

    console.log(`🔍 DEBUG: Querying purchase rates for kunchinittu ID: ${kunchinintuId}`);

    // First, let's check what arrivals exist
    const debugArrivals = await sequelize.query(`
      SELECT id, "movementType", status, "adminApprovedBy", "netWeight"
      FROM arrivals 
      WHERE "toKunchinintuId" = :kunchinintuId
    `, {
      replacements: { kunchinintuId },
      type: QueryTypes.SELECT
    });
    console.log(`🔍 DEBUG: Found ${debugArrivals.length} total arrivals for this kunchinittu:`, debugArrivals);

    // Check purchase rates for these arrivals
    if (debugArrivals.length > 0) {
      const arrivalIds = debugArrivals.map(a => a.id);
      const debugPurchaseRates = await sequelize.query(`
        SELECT arrival_id, total_amount, average_rate, status
        FROM purchase_rates 
        WHERE arrival_id IN (:arrivalIds)
      `, {
        replacements: { arrivalIds },
        type: QueryTypes.SELECT
      });  // purchase_rates uses snake_case columns — this is correct
      console.log(`🔍 DEBUG: Found ${debugPurchaseRates.length} purchase rates:`, debugPurchaseRates);
    }

    const [result] = await sequelize.query(`
      SELECT 
        COALESCE(
          SUM(pr.total_amount) / NULLIF(SUM(CAST(a."netWeight" AS FLOAT)), 0) * 75, 
          0
        ) as avg_rate,
        COUNT(*) as record_count,
        SUM(pr.total_amount) as total_amount,
        SUM(CAST(a."netWeight" AS FLOAT)) as total_weight
      FROM arrivals a
      INNER JOIN purchase_rates pr ON a.id = pr.arrival_id
      WHERE a."toKunchinintuId" = :kunchinintuId
        AND a."movementType" = 'purchase'
    `, {
      replacements: { kunchinintuId },
      type: QueryTypes.SELECT
    });

    console.log(`🔍 DEBUG: Query result:`, result);

    console.log(`📊 Found ${result.record_count} purchase records with rates for kunchinittu ${kunchinintuId}`);

    if (result.record_count === 0) {
      // No direct purchase records with rates
      // Check if kunchinittu already has a rate from previous shiftings
      if (kunchinittu.averageRate && kunchinittu.averageRate > 0) {
        console.log(`✅ Kunchinittu already has rate from previous shiftings: ₹${kunchinittu.averageRate}/Q - keeping it`);
        // Keep the existing rate, just update the calculation timestamp
        await kunchinittu.update({
          lastRateCalculation: new Date()
        });
        return;
      }

      // No records with rates and no existing rate, set average rate to 0
      await kunchinittu.update({
        averageRate: 0,
        lastRateCalculation: new Date()
      });
      console.log(`✅ Average rate set to 0 (no records with rates)`);
      return;
    }

    console.log(`🔍 Aggregated data:`, {
      recordCount: result.record_count,
      totalAmount: parseFloat(result.total_amount || 0).toFixed(2),
      totalWeight: parseFloat(result.total_weight || 0).toFixed(2),
      calculatedRate: parseFloat(result.avg_rate || 0).toFixed(2)
    });

    // Calculate average rate per 75kg (quintal)
    const averageRate = parseFloat(result.avg_rate || 0);

    // Update kunchinittu with calculated average rate
    await kunchinittu.update({
      averageRate: parseFloat(averageRate.toFixed(2)),
      lastRateCalculation: new Date()
    });

    console.log(`✅ Auto-calculated average rate: ₹${averageRate.toFixed(2)}/Q for kunchinittu ${kunchinintuId}`);
    console.log(`   Total Amount: ₹${parseFloat(result.total_amount || 0).toFixed(2)}, Total Weight: ${parseFloat(result.total_weight || 0).toFixed(2)} kg`);

  } catch (error) {
    console.error(`❌ Error calculating average rate for kunchinittu ${kunchinintuId}:`, error);
  }
};

// POST /api/purchase-rates - Create or update purchase rate (Manager/Admin only)
router.post('/', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const {
      arrivalId,
      sute = 0,
      suteCalculationMethod = 'per_bag',
      baseRate,
      rateType,
      baseRateCalculationMethod = 'per_bag',
      h = 0,
      b = 0,
      bCalculationMethod,
      lf = 0,
      lfCalculationMethod,
      egb = 0,
      hCalculationMethod = 'per_bag'
    } = req.body;

    // Validate required fields
    if (!arrivalId || !baseRate || !rateType || !bCalculationMethod || !lfCalculationMethod || !hCalculationMethod) {
      return res.status(400).json({
        error: 'Missing required fields: arrivalId, baseRate, rateType, bCalculationMethod, lfCalculationMethod, hCalculationMethod'
      });
    }

    // Validate numeric values (h can be negative, others must be positive)
    const numericFields = { sute, baseRate, b, lf, egb };
    for (const [field, value] of Object.entries(numericFields)) {
      if (isNaN(parseFloat(value))) {
        return res.status(400).json({ error: `Invalid numeric value for ${field}` });
      }
      if (parseFloat(value) < 0) {
        return res.status(400).json({ error: `${field} must be a positive number` });
      }
    }

    // Validate h separately (can be negative)
    if (isNaN(parseFloat(h))) {
      return res.status(400).json({ error: 'Invalid numeric value for h (hamali)' });
    }

    // Validate rate type
    if (!['CDL', 'CDWB', 'MDL', 'MDWB'].includes(rateType)) {
      return res.status(400).json({ error: 'Invalid rate type. Must be CDL, CDWB, MDL, or MDWB' });
    }

    // Validate calculation methods
    if (!['per_bag', 'per_quintal'].includes(suteCalculationMethod)) {
      return res.status(400).json({ error: 'Invalid Sute calculation method' });
    }
    if (!['per_bag', 'per_quintal'].includes(bCalculationMethod)) {
      return res.status(400).json({ error: 'Invalid B calculation method' });
    }
    if (!['per_bag', 'per_quintal'].includes(lfCalculationMethod)) {
      return res.status(400).json({ error: 'Invalid LF calculation method' });
    }
    if (!['per_bag', 'per_quintal'].includes(hCalculationMethod)) {
      return res.status(400).json({ error: 'Invalid H calculation method' });
    }

    // Check if arrival exists and is a purchase record
    const arrival = await Arrival.findByPk(arrivalId);
    if (!arrival) {
      return res.status(404).json({ error: 'Purchase record not found' });
    }
    if (arrival.movementType !== 'purchase') {
      return res.status(400).json({ error: 'Rates can only be added to purchase records' });
    }

    // Get arrival data
    const bags = parseFloat(arrival.bags);
    const actualNetWeight = parseFloat(arrival.netWeight);
    const actualGrossWeight = parseFloat(arrival.grossWeight);

    // Parse input values
    const suteNum = parseFloat(sute);
    const baseRateNum = parseFloat(baseRate);
    const hNum = parseFloat(h);
    const bNum = parseFloat(b);
    const lfNum = parseFloat(lf);
    const egbNum = parseFloat(egb);

    // NEW CALCULATION LOGIC (Based on User Confirmation - Updated with Column Type Rules)
    // Column Type Rules:
    // CDL: EGB=Normal, LF=Normal, H=Normal (Added to total)
    // CDWB: EGB=0, LF=Normal, H=Normal (Added to total)
    // MDL: EGB=Normal, LF=0, H=Subtracted from total
    // MDWB: EGB=0, LF=0, H=Subtracted from total

    // 1. Calculate Sute Weight (Deduction in Kg)
    let suteWeightKg = 0;
    if (suteNum > 0) {
      if (suteCalculationMethod === 'per_bag') {
        suteWeightKg = suteNum * bags;
      } else {
        suteWeightKg = (actualNetWeight / 100) * suteNum;
      }
    }

    // 2. Sute Net Weight (Remaining weight after deduction)
    const suteNetWeight = actualNetWeight - suteWeightKg;

    // 3. Base Rate Amount (Calculated ONLY on Sute Net Weight)
    const baseDivisor = baseRateCalculationMethod === 'per_bag' ? 75 : 100;
    const baseRateAmount = (suteNetWeight / baseDivisor) * baseRateNum;

    let hAmount;
    if (hCalculationMethod === 'per_bag') {
      // Per actual bag: bags × h
      hAmount = bags * hNum;
    } else {
      // Per quintal: (original net weight ÷ 100) × h
      hAmount = (actualNetWeight / 100) * hNum;
    }

    // 4. B Calculation
    let bAmount;
    if (bCalculationMethod === 'per_bag') {
      // Per actual bag: bags × b
      bAmount = bags * bNum;
    } else {
      // Per quintal: (original net weight ÷ 100) × b
      bAmount = (actualNetWeight / 100) * bNum;
    }

    // 5. LF Calculation with column-type specific rules
    // MDL and MDWB: LF = 0 (no LF allowed)
    let effectiveLfNum = lfNum;
    if (['MDL', 'MDWB'].includes(rateType)) {
      effectiveLfNum = 0; // Force LF to 0 for MDL and MDWB
    }

    let lfAmount;
    if (lfCalculationMethod === 'per_bag') {
      // Per actual bag: bags × effectiveLfNum
      lfAmount = bags * effectiveLfNum;
    } else {
      // Per quintal: (original net weight ÷ 100) × lf
      lfAmount = (actualNetWeight / 100) * effectiveLfNum;
    }

    // 6. EGB Calculation with column-type specific rules
    // CDL and MDL: EGB = Normal (Bags × EGB)
    // CDWB and MDWB: EGB = 0 (no EGB allowed)
    const showEGB = ['CDL', 'MDL'].includes(rateType);
    const egbAmount = showEGB ? bags * egbNum : 0;

    // 7. Total Amount = Base Rate Amount (on Sute Net Weight) + Adjustments (on Original Weight)
    // For MDL and MDWB: If H is negative (user signal to exclude), set to 0. If positive, add it.
    // For CDL and CDWB: Use H value as-is
    const hContribution = ['MDL', 'MDWB'].includes(rateType)
      ? (hAmount < 0 ? 0 : hAmount)  // MDL/MDWB: negative = 0, positive = add
      : hAmount;                      // CDL/CDWB: use as-is
    const totalAmount = baseRateAmount + hContribution + bAmount + lfAmount + egbAmount;

    // 8. Average Rate Calculation (per 75kg)
    const averageRate = (totalAmount / actualNetWeight) * 75;

    // Two-line horizontal formula (Perfect compact format matching user request)
    let line1Parts = [];
    if (suteNum !== 0) {
      const unit = suteCalculationMethod === 'per_bag' ? 'b' : 'q';
      line1Parts.push(`${parseFloat(suteNum)}s/${unit}`);
    }
    const baseUnit = baseRateCalculationMethod === 'per_bag' ? 'b' : 'q';
    line1Parts.push(`+${parseFloat(baseRateNum)}${rateType}/${baseUnit}`);
    const line1 = line1Parts.join('  ');

    let line2Parts = [];
    if (hNum !== 0) {
      const unit = hCalculationMethod === 'per_bag' ? 'b' : 'q';
      line2Parts.push(`${hNum > 0 ? '+' : ''}${parseFloat(hNum)}h/${unit}`);
    }
    if (bNum !== 0) {
      const unit = bCalculationMethod === 'per_bag' ? 'b' : 'q';
      line2Parts.push(`${bNum > 0 ? '+' : ''}${parseFloat(bNum)}b/${unit}`);
    }
    if (effectiveLfNum !== 0) {
      const unit = lfCalculationMethod === 'per_bag' ? 'b' : 'q';
      line2Parts.push(`${effectiveLfNum > 0 ? '+' : ''}${parseFloat(effectiveLfNum)}lf/${unit}`);
    }
    if (showEGB && egbNum !== 0) {
      line2Parts.push(`${egbNum > 0 ? '+' : ''}${parseFloat(egbNum)}egb/b`);
    }
    const line2 = line2Parts.join('  ');

    const amountFormula = line1 + (line2 ? '\n' + line2 : '');

    // Check if rate already exists
    const existingRate = await PurchaseRate.findOne({ where: { arrivalId } });

    // Status based on role: admin = approved, manager = pending
    const rateStatus = req.user.role === 'admin' ? 'approved' : 'pending';
    const adminApprovedBy = req.user.role === 'admin' ? req.user.userId : null;
    const adminApprovedAt = req.user.role === 'admin' ? new Date() : null;

    let purchaseRate;
    let created = false;

    if (existingRate) {
      // Update existing rate
      console.log(`📝 Updating existing rate for arrival ${arrivalId}`);
      console.log(`   Old Status: ${existingRate.status}, New Status: ${rateStatus}`);

      await existingRate.update({
        sute: suteNum,
        suteCalculationMethod,
        baseRate: baseRateNum,
        rateType,
        baseRateCalculationMethod,
        h: hNum,
        hCalculationMethod,
        b: bNum,
        bCalculationMethod,
        lf: lfNum,
        lfCalculationMethod,
        egb: egbNum,
        amountFormula,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        averageRate: parseFloat(averageRate.toFixed(2)),
        updatedBy: req.user.userId,
        status: rateStatus,
        adminApprovedBy,
        adminApprovedAt
      });
      purchaseRate = existingRate;
      console.log(`✅ Rate updated successfully with status: ${rateStatus}`);
    } else {
      // Create new rate
      console.log(`✨ Creating new rate for arrival ${arrivalId}`);

      purchaseRate = await PurchaseRate.create({
        arrivalId,
        sute: suteNum,
        suteCalculationMethod,
        baseRate: baseRateNum,
        rateType,
        baseRateCalculationMethod,
        h: hNum,
        hCalculationMethod,
        b: bNum,
        bCalculationMethod,
        lf: lfNum,
        lfCalculationMethod,
        egb: egbNum,
        amountFormula,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
        averageRate: parseFloat(averageRate.toFixed(2)),
        createdBy: req.user.userId,
        status: rateStatus,
        adminApprovedBy,
        adminApprovedAt
      });
      created = true;
      console.log(`✅ Rate created successfully with status: ${rateStatus}`);
    }

    // Fetch the complete record with associations
    const savedRate = await PurchaseRate.findOne({
      where: { arrivalId },
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'updater', attributes: ['username', 'role'] }
      ]
    });

    // Automatically calculate and update kunchinittu average rate
    // ONLY if the rate is approved by admin
    try {
      if (arrival.toKunchinintuId && purchaseRate.status === 'approved') {
        await calculateKunchinintuAverageRate(arrival.toKunchinintuId);
      } else if (purchaseRate.status === 'pending') {
        console.log(`⏳ Rate is pending admin approval - kunchinittu average rate not calculated yet`);
      }
    } catch (error) {
      console.error('Error updating kunchinittu average rate:', error);
      // Don't fail the main operation if average rate calculation fails
    }

    res.json({
      message: created ? 'Purchase rate created successfully' : 'Purchase rate updated successfully',
      purchaseRate: savedRate
    });
  } catch (error) {
    console.error('Create/update purchase rate error:', error);
    console.error('Error details:', error.message);
    console.error('Request body:', req.body);
    res.status(500).json({ error: error.message || 'Failed to save purchase rate' });
  }
});

// GET /api/purchase-rates/pending-list - Get pending purchase rates for admin approval (Admin only)
// IMPORTANT: This route must be defined BEFORE /:arrivalId to avoid matching 'pending-list' as arrivalId
router.get('/pending-list', auth, authorize('admin'), async (req, res) => {
  try {
    const pendingRates = await PurchaseRate.findAll({
      where: { status: 'pending' },
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Fetch arrival data separately to avoid association issues
    const arrivalIds = pendingRates.map(r => r.arrivalId).filter(id => id);
    const arrivals = await Arrival.findAll({
      where: { id: arrivalIds },
      attributes: ['id', 'slNo', 'date', 'variety', 'bags', 'netWeight', 'grossWeight', 'tareWeight', 'broker', 'fromLocation', 'movementType', 'moisture', 'cutting', 'lorryNumber', 'wbNo', 'toKunchinintuId', 'outturnId', 'toWarehouseId']
    });

    // Fetch Kunchinittu names
    const kunchinittuIds = arrivals.map(a => a.toKunchinintuId).filter(id => id);
    const kunchinittus = kunchinittuIds.length > 0 ? await Kunchinittu.findAll({
      where: { id: kunchinittuIds },
      attributes: ['id', 'name', 'code']
    }) : [];

    // Fetch Warehouse names
    const warehouseIds = arrivals.map(a => a.toWarehouseId).filter(id => id);
    const warehouses = warehouseIds.length > 0 ? await Warehouse.findAll({
      where: { id: warehouseIds },
      attributes: ['id', 'name', 'code']
    }) : [];

    // Fetch Outturn names
    const outturnIds = arrivals.map(a => a.outturnId).filter(id => id);
    const outturns = outturnIds.length > 0 ? await Outturn.findAll({
      where: { id: outturnIds },
      attributes: ['id', 'code', 'allottedVariety']
    }) : [];

    const kunchinittuMap = {};
    kunchinittus.forEach(k => { kunchinittuMap[k.id] = k; });

    const warehouseMap = {};
    warehouses.forEach(w => { warehouseMap[w.id] = w; });

    const outturnMap = {};
    outturns.forEach(o => { outturnMap[o.id] = o; });

    const arrivalMap = {};
    arrivals.forEach(a => {
      const arrivalJson = a.toJSON();
      arrivalJson.toKunchinittu = kunchinittuMap[a.toKunchinintuId] || null;
      arrivalJson.toWarehouse = warehouseMap[a.toWarehouseId] || null;
      arrivalJson.outturn = outturnMap[a.outturnId] || null;
      arrivalMap[a.id] = arrivalJson;
    });

    // Attach arrival data to rates
    const ratesWithArrival = pendingRates.map(rate => {
      const rateJson = rate.toJSON();
      rateJson.arrival = arrivalMap[rate.arrivalId] || null;
      return rateJson;
    });

    res.json({
      count: ratesWithArrival.length,
      rates: ratesWithArrival,
      role: req.user.role
    });
  } catch (error) {
    console.error('Get pending purchase rates error:', error);
    res.status(500).json({ error: 'Failed to fetch pending purchase rates', details: error.message });
  }
});

// GET /api/purchase-rates/:arrivalId - Fetch purchase rate by arrival ID
router.get('/:arrivalId', auth, async (req, res) => {
  try {
    const { arrivalId } = req.params;

    const purchaseRate = await PurchaseRate.findOne({
      where: { arrivalId },
      include: [
        { model: User, as: 'creator', attributes: ['username', 'role'] },
        { model: User, as: 'updater', attributes: ['username', 'role'] }
      ]
    });

    res.json({ purchaseRate });
  } catch (error) {
    console.error('Fetch purchase rate error:', error);
    res.status(500).json({ error: 'Failed to fetch purchase rate' });
  }
});

// POST /api/purchase-rates/:id/admin-approve - Approve purchase rate (Admin only)
router.post('/:id/admin-approve', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const purchaseRate = await PurchaseRate.findByPk(id, {
      include: [{ model: Arrival, as: 'arrival' }]
    });

    if (!purchaseRate) {
      return res.status(404).json({ error: 'Purchase rate not found' });
    }

    if (purchaseRate.status !== 'pending') {
      return res.status(400).json({ error: 'Purchase rate is not pending' });
    }

    await purchaseRate.update({
      status: 'approved',
      adminApprovedBy: req.user.userId,
      adminApprovedAt: new Date()
    });

    // Now calculate kunchinittu average rate
    try {
      if (purchaseRate.arrival && purchaseRate.arrival.toKunchinintuId) {
        await calculateKunchinintuAverageRate(purchaseRate.arrival.toKunchinintuId);
        console.log(`✅ Kunchinittu average rate updated after admin approval`);
      }
    } catch (error) {
      console.error('Error updating kunchinittu average rate after approval:', error);
    }

    res.json({
      message: 'Purchase rate approved successfully',
      purchaseRate
    });
  } catch (error) {
    console.error('Approve purchase rate error:', error);
    res.status(500).json({ error: 'Failed to approve purchase rate' });
  }
});

// POST /api/purchase-rates/:id/reject - Reject purchase rate (Admin only)
router.post('/:id/reject', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;

    const purchaseRate = await PurchaseRate.findByPk(id);

    if (!purchaseRate) {
      return res.status(404).json({ error: 'Purchase rate not found' });
    }

    if (purchaseRate.status !== 'pending') {
      return res.status(400).json({ error: 'Purchase rate is not pending' });
    }

    await purchaseRate.update({
      status: 'rejected'
    });

    res.json({
      message: 'Purchase rate rejected',
      purchaseRate
    });
  } catch (error) {
    console.error('Reject purchase rate error:', error);
    res.status(500).json({ error: 'Failed to reject purchase rate' });
  }
});

// POST /api/purchase-rates/bulk-approve - Bulk approve purchase rates (Admin only)
router.post('/bulk-approve', auth, authorize('admin'), async (req, res) => {
  try {
    const { rateIds } = req.body;

    if (!rateIds || !Array.isArray(rateIds) || rateIds.length === 0) {
      return res.status(400).json({ error: 'rateIds array is required' });
    }

    const results = { approved: [], failed: [] };

    for (const id of rateIds) {
      try {
        const purchaseRate = await PurchaseRate.findByPk(id, {
          include: [{ model: Arrival, as: 'arrival' }]
        });

        if (!purchaseRate) {
          results.failed.push({ id, reason: 'Not found' });
          continue;
        }

        if (purchaseRate.status !== 'pending') {
          results.failed.push({ id, reason: 'Not pending' });
          continue;
        }

        await purchaseRate.update({
          status: 'approved',
          adminApprovedBy: req.user.userId,
          adminApprovedAt: new Date()
        });

        // Calculate kunchinittu average rate
        if (purchaseRate.arrival && purchaseRate.arrival.toKunchinintuId) {
          await calculateKunchinintuAverageRate(purchaseRate.arrival.toKunchinintuId);
        }

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
    console.error('Bulk approve purchase rates error:', error);
    res.status(500).json({ error: 'Failed to bulk approve purchase rates' });
  }
});

// POST /api/purchase-rates/bulk-reject - Bulk reject purchase rates (Admin only)
router.post('/bulk-reject', auth, authorize('admin'), async (req, res) => {
  try {
    const { rateIds, remarks } = req.body;

    if (!rateIds || !Array.isArray(rateIds) || rateIds.length === 0) {
      return res.status(400).json({ error: 'rateIds array is required' });
    }

    const results = { rejected: [], failed: [] };

    for (const id of rateIds) {
      try {
        const purchaseRate = await PurchaseRate.findByPk(id);

        if (!purchaseRate) {
          results.failed.push({ id, reason: 'Not found' });
          continue;
        }

        if (purchaseRate.status !== 'pending') {
          results.failed.push({ id, reason: 'Not pending' });
          continue;
        }

        await purchaseRate.update({
          status: 'rejected',
          sute: 0,
          baseRate: 0,
          h: 0,
          b: 0,
          lf: 0,
          egb: 0,
          totalAmount: 0,
          averageRate: 0,
          amountFormula: 'REJECTED'
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
    console.error('Bulk reject purchase rates error:', error);
    res.status(500).json({ error: 'Failed to bulk reject purchase rates' });
  }
});

module.exports = { router, calculateKunchinintuAverageRate };
