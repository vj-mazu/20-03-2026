const express = require('express');
const { Op, Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');
const { auth, authorize } = require('../middleware/auth');
const Arrival = require('../models/Arrival');
const { Warehouse, Kunchinittu, Variety } = require('../models/Location');
const User = require('../models/User');
const Outturn = require('../models/Outturn');
const RiceProduction = require('../models/RiceProduction');
const PurchaseRate = require('../models/PurchaseRate');
const PDFDocument = require('pdfkit');

const router = express.Router();

// Get Kunchinittu Ledger — OPTIMIZED: Separate inward/outward queries + SQL aggregation
router.get('/kunchinittu/:id', auth, async (req, res) => {
  try {
    const startTime = Date.now();
    const { id } = req.params;
    const { dateFrom, dateTo, page = 1, limit = 250 } = req.query;

    // Pagination settings
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(limit)), 500); // Max 500 per page
    const offset = (pageNum - 1) * limitNum;

    // Get Kunchinittu details
    const kunchinittu = await Kunchinittu.findByPk(id, {
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['name', 'code'] },
        { model: Variety, as: 'variety', attributes: ['name', 'code'] }
      ]
    });

    if (!kunchinittu) {
      return res.status(404).json({ error: 'Kunchinittu not found' });
    }

    // Build common date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      dateFilter.date = {};
      if (dateFrom) dateFilter.date[Op.gte] = dateFrom;
      if (dateTo) dateFilter.date[Op.lte] = dateTo;
    }

    const commonFilter = {
      status: 'approved',
      adminApprovedBy: { [Op.not]: null },
      ...dateFilter
    };

    // Build INWARD and OUTWARD where clauses separately (no OR — faster queries)
    const inwardWhere = {
      ...commonFilter,
      toKunchinintuId: id,
      movementType: { [Op.in]: ['purchase', 'shifting', 'loose'] }
    };

    const outwardWhere = {
      ...commonFilter,
      fromKunchinintuId: id,
      movementType: { [Op.in]: ['shifting', 'production-shifting'] }
    };

    const commonIncludes = [
      { model: User, as: 'creator', attributes: ['username'] },
      { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
      { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
      { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
      { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
      { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
      { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] }
    ];

    // Build date conditions for raw SQL
    const dateConditions = [];
    const dateReplacements = { id };
    if (dateFrom) {
      dateConditions.push('a.date >= :dateFrom');
      dateReplacements.dateFrom = dateFrom;
    }
    if (dateTo) {
      dateConditions.push('a.date <= :dateTo');
      dateReplacements.dateTo = dateTo;
    }
    const dateSQL = dateConditions.length > 0 ? ' AND ' + dateConditions.join(' AND ') : '';

    // Run ALL queries in parallel for maximum speed
    const [
      inwardTotalsRaw,
      outwardTotalsRaw,
      inward,
      outward,
      outturnIdsRaw,
      avgRateRaw
    ] = await Promise.all([
      // 1. Inward count + totals via raw SQL (reliable column names)
      sequelize.query(`
        SELECT 
          COUNT(*) AS "count",
          COALESCE(SUM(CAST(a.bags AS INTEGER)), 0) AS "totalBags",
          COALESCE(SUM(CAST(a."netWeight" AS FLOAT)), 0) AS "totalNetWeight"
        FROM arrivals a
        WHERE a."toKunchinintuId" = :id
          AND a.status = 'approved'
          AND a."adminApprovedBy" IS NOT NULL
          AND a."movementType" IN ('purchase', 'shifting', 'loose')
          ${dateSQL}
      `, {
        replacements: dateReplacements,
        type: sequelize.QueryTypes.SELECT
      }),
      // 2. Outward count + totals via raw SQL
      sequelize.query(`
        SELECT 
          COUNT(*) AS "count",
          COALESCE(SUM(CAST(a.bags AS INTEGER)), 0) AS "totalBags",
          COALESCE(SUM(CAST(a."netWeight" AS FLOAT)), 0) AS "totalNetWeight"
        FROM arrivals a
        WHERE a."fromKunchinintuId" = :id
          AND a.status = 'approved'
          AND a."adminApprovedBy" IS NOT NULL
          AND a."movementType" IN ('shifting', 'production-shifting')
          ${dateSQL}
      `, {
        replacements: dateReplacements,
        type: sequelize.QueryTypes.SELECT
      }),
      // 3. Inward paginated data (ORM with includes — works fine)
      Arrival.findAll({
        where: inwardWhere,
        include: [
          ...commonIncludes,
          { model: PurchaseRate, as: 'purchaseRate', attributes: ['baseRate', 'rateType', 'sute', 'h', 'b', 'lf', 'egb', 'totalAmount', 'averageRate', 'amountFormula'], required: false }
        ],
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
        limit: limitNum,
        offset: offset
      }),
      // 4. Outward paginated data
      Arrival.findAll({
        where: outwardWhere,
        include: commonIncludes,
        order: [['date', 'ASC'], ['createdAt', 'ASC']],
        limit: limitNum,
        offset: offset
      }),
      // 5. Outturn IDs for rice production (only IDs, very fast)
      sequelize.query(`
        SELECT DISTINCT a."outturnId"
        FROM arrivals a
        WHERE (a."toKunchinintuId" = :id OR a."fromKunchinintuId" = :id)
          AND a.status = 'approved'
          AND a."adminApprovedBy" IS NOT NULL
          AND a."outturnId" IS NOT NULL
          ${dateSQL}
      `, {
        replacements: dateReplacements,
        type: sequelize.QueryTypes.SELECT
      }),
      // 6. Average rate via SQL aggregation (purchase inward with rates)
      sequelize.query(`
        SELECT 
          COALESCE(SUM(CAST(pr.total_amount AS FLOAT)), 0) AS "totalAmount",
          COALESCE(SUM(CAST(a."netWeight" AS FLOAT)), 0) AS "totalWeight"
        FROM arrivals a
        INNER JOIN purchase_rates pr ON pr.arrival_id = a.id
        WHERE a."toKunchinintuId" = :id
          AND a.status = 'approved'
          AND a."adminApprovedBy" IS NOT NULL
          AND a."movementType" = 'purchase'
          AND pr.total_amount IS NOT NULL
          AND a."netWeight" IS NOT NULL
          AND CAST(pr.total_amount AS FLOAT) > 0
          AND CAST(a."netWeight" AS FLOAT) > 0
      `, {
        replacements: { id },
        type: sequelize.QueryTypes.SELECT
      })
    ]);

    const inwardCount = parseInt(inwardTotalsRaw[0]?.count || 0);
    const outwardCount = parseInt(outwardTotalsRaw[0]?.count || 0);
    const totalCount = inwardCount + outwardCount;
    const totalPages = Math.ceil(Math.max(inwardCount, outwardCount) / limitNum);

    // Extract totals from raw SQL results
    const inwardTotal = {
      bags: parseInt(inwardTotalsRaw[0]?.totalBags || 0),
      netWeight: parseFloat(inwardTotalsRaw[0]?.totalNetWeight || 0)
    };

    const outwardTotal = {
      bags: parseInt(outwardTotalsRaw[0]?.totalBags || 0),
      netWeight: parseFloat(outwardTotalsRaw[0]?.totalNetWeight || 0)
    };

    const remaining = {
      bags: inwardTotal.bags - outwardTotal.bags,
      netWeight: inwardTotal.netWeight - outwardTotal.netWeight
    };

    // Get outturn IDs for rice production query
    const outturnIds = outturnIdsRaw.map(r => r.outturnId);

    // Fetch rice productions only if there are outturns
    let riceProductions = [];
    if (outturnIds.length > 0) {
      const riceProductionWhere = {
        outturnId: { [Op.in]: outturnIds },
        status: 'approved',
      };
      if (dateFilter.date) riceProductionWhere.date = dateFilter.date;

      riceProductions = await RiceProduction.findAll({
        where: riceProductionWhere,
        include: [
          { model: Outturn, as: 'outturn', attributes: ['code'] },
          { model: User, as: 'creator', attributes: ['username'] },
        ],
      });
    }

    // Calculate average rate from SQL result — no more JS loop over all records
    let calculatedAverageRate = 0;
    try {
      const rateData = avgRateRaw[0];
      if (rateData && parseFloat(rateData.totalWeight) > 0) {
        calculatedAverageRate = (parseFloat(rateData.totalAmount) / parseFloat(rateData.totalWeight)) * 75;
        // Save to database
        await kunchinittu.update({
          averageRate: parseFloat(calculatedAverageRate.toFixed(2)),
          lastRateCalculation: new Date()
        });
      }
    } catch (error) {
      console.error('Error calculating average rate:', error);
    }

    const responseTime = Date.now() - startTime;

    res.json({
      kunchinittu: {
        id: kunchinittu.id,
        name: kunchinittu.name,
        code: kunchinittu.code,
        warehouse: kunchinittu.warehouse,
        variety: kunchinittu.variety,
        averageRate: parseFloat(calculatedAverageRate.toFixed(2)),
        lastRateCalculation: new Date(),
        isClosed: kunchinittu.isClosed || false,
        closedAt: kunchinittu.closedAt,
        closedBy: kunchinittu.closedBy
      },
      transactions: {
        inward,
        outward
      },
      totals: {
        inward: inwardTotal,
        outward: outwardTotal,
        remaining
      },
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalRecords: totalCount,
        totalPages: totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      },
      performance: { responseTime: `${responseTime}ms` }
    });
  } catch (error) {
    console.error('Get kunchinittu ledger error:', error);
    res.json({
      kunchinittu: null,
      transactions: { inward: [], outward: [] },
      totals: { inward: { bags: 0, netWeight: 0 }, outward: { bags: 0, netWeight: 0 }, remaining: { bags: 0, netWeight: 0 } }
    });
  }
});





// Export Kunchinittu Ledger to PDF
router.get('/kunchinittu/:id/pdf', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;

    // Get ledger data directly
    const kunchinittu = await Kunchinittu.findByPk(id, {
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['name', 'code'] }
      ]
    });

    if (!kunchinittu) {
      return res.status(404).json({ error: 'Kunchinittu not found' });
    }

    const where = {
      [Op.or]: [
        { toKunchinintuId: id }, // Inward (Purchase + Shifting in)
        { fromKunchinintuId: id } // Outward (Shifting out)
      ],
      status: 'approved',
      adminApprovedBy: { [Op.not]: null }
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const transactions = await Arrival.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] }
      ],
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    // Separate inward and outward transactions
    const inward = transactions.filter(t => t.toKunchinintuId == id);
    const outward = transactions.filter(t => t.fromKunchinintuId == id);

    // Get all outturns associated with this kunchinittu for rice production
    const outturnIds = [...new Set(
      transactions
        .filter(t => t.outturnId)
        .map(t => t.outturnId)
    )];

    // Get all rice production records for these outturns within the date range
    const riceProductionWhere = {
      outturnId: { [Op.in]: outturnIds },
      status: 'approved',
    };

    if (where.date) {
      riceProductionWhere.date = where.date;
    }

    const riceProductions = outturnIds.length > 0 ? await RiceProduction.findAll({
      where: riceProductionWhere,
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code'] },
        { model: User, as: 'creator', attributes: ['username'] },
      ],
    }) : [];

    // Calculate totals
    const inwardTotal = {
      bags: inward.reduce((sum, t) => sum + (t.bags || 0), 0),
      netWeight: inward.reduce((sum, t) => sum + (parseFloat(t.netWeight) || 0), 0)
    };

    const outwardTotal = {
      bags: outward.reduce((sum, t) => sum + (t.bags || 0), 0),
      netWeight: outward.reduce((sum, t) => sum + (parseFloat(t.netWeight) || 0), 0)
    };

    // Add rice production consumed to outward total
    const consumedTotal = {
      bags: riceProductions.reduce((sum, p) => {
        const paddyDeduction = p.paddyBagsDeducted && p.paddyBagsDeducted > 0
          ? parseInt(p.paddyBagsDeducted)
          : Math.round(parseFloat(p.quantityQuintals || 0) * 3);
        return sum + paddyDeduction;
      }, 0),
      netWeight: riceProductions.reduce((sum, p) => sum + parseFloat(p.quantityQuintals * 100 || 0), 0)
    };

    outwardTotal.bags += consumedTotal.bags;
    outwardTotal.netWeight += consumedTotal.netWeight;

    const remaining = {
      bags: inwardTotal.bags - outwardTotal.bags,
      netWeight: inwardTotal.netWeight - outwardTotal.netWeight
    };

    // Group rice production by date and outturn
    const riceProductionByDate = {};
    riceProductions.forEach(rp => {
      const dateKey = rp.date;
      const outturnCode = rp.outturn?.code || 'Unknown';
      const key = `${dateKey}-${outturnCode}`;

      if (!riceProductionByDate[key]) {
        riceProductionByDate[key] = {
          date: dateKey,
          outturnCode: outturnCode,
          bags: 0,
          productType: rp.productType
        };
      }
      riceProductionByDate[key].bags += parseInt(rp.paddyBagsDeducted || 0);
    });

    const riceProductionDateWise = Object.values(riceProductionByDate).sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const ledgerResponse = {
      kunchinittu: {
        id: kunchinittu.id,
        name: kunchinittu.name,
        code: kunchinittu.code,
        warehouse: kunchinittu.warehouse
      },
      transactions: {
        inward,
        outward
      },
      totals: {
        inward: inwardTotal,
        outward: outwardTotal,
        remaining
      }
    };

    const { kunchinittu: ledgerKunchinittu, transactions: ledgerTransactions, totals } = ledgerResponse;

    const doc = new PDFDocument({ margin: 15, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=kunchinittu_ledger_${ledgerKunchinittu.code}_${Date.now()}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold')
      .text('Kunchinittu Ledger', { align: 'center' });
    doc.fontSize(9).font('Helvetica')
      .text(`Kunchi Nittu: ${ledgerKunchinittu.code} | Warehouse: ${ledgerKunchinittu.warehouse?.name} | Variety: ${ledgerKunchinittu.variety?.name || 'N/A'}`, { align: 'center' });

    // Summary table
    doc.moveDown(0.5);
    const summaryY = doc.y;
    doc.fontSize(9).font('Helvetica-Bold');

    // Summary boxes
    doc.rect(50, summaryY, 150, 20).fillAndStroke('#e8f4f8', '#4a90e2');
    doc.fillColor('#000000').text('Inward: ' + totals.inward.bags + ' bags | ' + totals.inward.netWeight.toFixed(2) + ' kg', 55, summaryY + 6);

    doc.rect(210, summaryY, 150, 20).fillAndStroke('#ffe8e8', '#e24a4a');
    doc.fillColor('#000000').text('Outward: ' + totals.outward.bags + ' bags | ' + totals.outward.netWeight.toFixed(2) + ' kg', 215, summaryY + 6);

    doc.rect(370, summaryY, 150, 20).fillAndStroke('#e8ffe8', '#4ae24a');
    doc.fillColor('#000000').text('Remaining: ' + totals.remaining.bags + ' bags | ' + totals.remaining.netWeight.toFixed(2) + ' kg', 375, summaryY + 6);

    doc.moveDown(2);

    // Inward Section
    doc.fontSize(12).font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Inward Transactions', 50);

    doc.moveDown(0.3);

    // Table Header - Landscape with proper spacing
    const headers = ['S.No', 'Date', 'Type', 'Broker', 'From', 'To', 'Variety', 'Bags', 'Moist%', 'Cut', 'WB No', 'Net Wt', 'Lorry'];
    const colWidths = [30, 50, 55, 60, 75, 75, 60, 35, 40, 30, 50, 50, 55];

    let y = doc.y;
    let x = 50;

    // Calculate total width
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);

    // Header row
    doc.rect(50, y, totalWidth, 20).fillAndStroke('#4a90e2');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

    headers.forEach((header, i) => {
      doc.text(header, x + 2, y + 6, { width: colWidths[i] - 4, align: 'center' });
      x += colWidths[i];
    });

    y += 20;
    doc.fillColor('#000000').font('Helvetica');

    // Inward Data Rows
    ledgerTransactions.inward.forEach((record, idx) => {
      x = 50;
      const bgColor = record.movementType === 'loose' ? '#fffbeb' : (idx % 2 === 0 ? '#f8f9fa' : '#ffffff');

      doc.rect(50, y, totalWidth, 18).fillAndStroke(bgColor, '#ddd');

      const rowData = [
        (idx + 1).toString(),
        new Date(record.date).toLocaleDateString('en-GB'),
        record.movementType === 'purchase' ? 'Purchase' : record.movementType === 'loose' ? 'Loose' : 'Shifting',
        record.movementType === 'loose' ? '-' : (record.broker || '-'),
        record.movementType === 'loose' ? '-' : (record.movementType === 'purchase' ? (record.fromLocation || '-') : `${record.fromKunchinittu?.code || ''} ${record.fromWarehouse?.name || ''}`),
        record.movementType === 'loose' ? '-' : `${ledgerKunchinittu.code} ${ledgerKunchinittu.warehouse?.name}`,
        record.movementType === 'loose' ? '-' : (record.variety || '-'),
        (record.bags || 0).toString(),
        record.movementType === 'loose' ? '-' : (record.moisture || '-').toString(),
        record.movementType === 'loose' ? '-' : (record.cutting || '-'),
        record.movementType === 'loose' ? '-' : (record.wbNo || '-'),
        record.movementType === 'loose' ? '-' : (parseFloat(record.netWeight) || 0).toFixed(2),
        record.movementType === 'loose' ? '-' : (record.lorryNumber || '-')
      ];

      rowData.forEach((cell, i) => {
        doc.fontSize(7).text(cell, x + 2, y + 5, { width: colWidths[i] - 4, align: 'center', ellipsis: true });
        x += colWidths[i];
      });

      y += 18;

      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
      }
    });

    // Inward Total
    x = 50;
    doc.rect(50, y, totalWidth, 20).fillAndStroke('#000000');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Total', x + 2, y + 6, { width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6] - 4 });
    x += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6];
    doc.text(totals.inward.bags.toString(), x + 2, y + 6, { width: colWidths[7] - 4, align: 'center' });
    x += colWidths[7] + colWidths[8] + colWidths[9] + colWidths[10];
    doc.text(totals.inward.netWeight.toFixed(2), x + 2, y + 6, { width: colWidths[11] - 4, align: 'center' });

    doc.moveDown(2);

    // Outward Section
    doc.fontSize(12).font('Helvetica-Bold')
      .fillColor('#000000')
      .text('Outward Transactions', 50);

    doc.moveDown(0.3);

    // Outward Table
    y = doc.y;
    x = 50;

    // Header row
    doc.rect(50, y, totalWidth, 20).fillAndStroke('#4a90e2');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

    headers.forEach((header, i) => {
      doc.text(header, x + 2, y + 6, { width: colWidths[i] - 4, align: 'center' });
      x += colWidths[i];
    });

    y += 20;
    doc.fillColor('#000000').font('Helvetica');

    // Outward Data Rows
    ledgerTransactions.outward.forEach((record, idx) => {
      x = 50;
      const bgColor = idx % 2 === 0 ? '#f8f9fa' : '#ffffff';

      doc.rect(50, y, totalWidth, 18).fillAndStroke(bgColor, '#ddd');

      const rowData = [
        (idx + 1).toString(),
        new Date(record.date).toLocaleDateString('en-GB'),
        record.movementType === 'production-shifting' ? 'Prod. Shift' : 'Shifting',
        '-',
        `${ledgerKunchinittu.code} ${ledgerKunchinittu.warehouse?.name}`,
        record.movementType === 'production-shifting' ? `Production - ${record.outturn?.code || 'out01'}` : `${record.toKunchinittu?.code || ''} ${record.toWarehouseShift?.name || ''}`,
        record.variety || '-',
        (record.bags || 0).toString(),
        (record.moisture || '-').toString(),
        record.cutting || '-',
        record.wbNo || '-',
        (parseFloat(record.netWeight) || 0).toFixed(2),
        record.lorryNumber || '-'
      ];

      rowData.forEach((cell, i) => {
        doc.fontSize(7).text(cell, x + 2, y + 5, { width: colWidths[i] - 4, align: 'center', ellipsis: true });
        x += colWidths[i];
      });

      y += 18;

      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 50;
      }
    });

    // Outward Total
    x = 50;
    doc.rect(50, y, totalWidth, 20).fillAndStroke('#000000');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Total', x + 2, y + 6, { width: colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6] - 4 });
    x += colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + colWidths[6];
    doc.text(totals.outward.bags.toString(), x + 2, y + 6, { width: colWidths[7] - 4, align: 'center' });
    x += colWidths[7] + colWidths[8] + colWidths[9] + colWidths[10];
    doc.text(totals.outward.netWeight.toFixed(2), x + 2, y + 6, { width: colWidths[11] - 4, align: 'center' });

    // Rice Production Date-Wise Section
    if (riceProductionDateWise.length > 0) {
      doc.moveDown(2);

      doc.fontSize(12).font('Helvetica-Bold')
        .fillColor('#000000')
        .text('Rice Production Consumption (Date-wise)', 50);

      doc.moveDown(0.3);

      const rpHeaders = ['S.No', 'Date', 'Outturn Code', 'Bags Consumed', 'Product Type'];
      const rpColWidths = [50, 100, 150, 150, 200];

      y = doc.y;
      x = 50;

      const rpTotalWidth = rpColWidths.reduce((a, b) => a + b, 0);

      // Header row
      doc.rect(50, y, rpTotalWidth, 20).fillAndStroke('#dc2626');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

      rpHeaders.forEach((header, i) => {
        doc.text(header, x + 2, y + 6, { width: rpColWidths[i] - 4, align: 'center' });
        x += rpColWidths[i];
      });

      y += 20;
      doc.fillColor('#000000').font('Helvetica');

      // Data rows
      riceProductionDateWise.forEach((rp, idx) => {
        x = 50;
        const bgColor = idx % 2 === 0 ? '#f8f9fa' : '#ffffff';

        doc.rect(50, y, rpTotalWidth, 18).fillAndStroke(bgColor, '#ddd');

        const rpRowData = [
          (idx + 1).toString(),
          new Date(rp.date).toLocaleDateString('en-GB'),
          rp.outturnCode,
          (rp.paddyBagsDeducted || rp.bags).toString(),
          rp.productType || '-'
        ];

        rpRowData.forEach((cell, i) => {
          doc.fontSize(7).text(cell, x + 2, y + 5, { width: rpColWidths[i] - 4, align: 'center', ellipsis: true });
          x += rpColWidths[i];
        });

        y += 18;

        if (y > doc.page.height - 60) {
          doc.addPage();
          y = 50;
        }
      });

      // Total row
      x = 50;
      doc.rect(50, y, rpTotalWidth, 20).fillAndStroke('#000000');
      doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
      doc.text('Total Consumed', x + 2, y + 6, { width: rpColWidths[0] + rpColWidths[1] + rpColWidths[2] - 4 });
      x += rpColWidths[0] + rpColWidths[1] + rpColWidths[2];
      const totalConsumed = riceProductionDateWise.reduce((sum, rp) => sum + (rp.paddyBagsDeducted || rp.bags), 0);
      doc.text(totalConsumed.toString(), x + 2, y + 6, { width: rpColWidths[3] - 4, align: 'center' });
    }

    doc.end();
  } catch (error) {
    console.error('Kunchinittu ledger PDF error:', error);
    res.status(500).json({ error: 'Failed to generate kunchinittu ledger PDF' });
  }
});

// Get Paddy Stock with Daily Ledger Format (Opening Stock, Bifurcation, Closing Stock)
router.get('/paddy-stock/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo, limit } = req.query;

    // Enhanced pagination: Support up to 10,000 records for comprehensive stock view
    const limitNum = limit ? Math.min(parseInt(limit), 10000) : 1000;

    // Get Kunchinittu details
    const kunchinittu = await Kunchinittu.findByPk(id, {
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['name', 'code'] },
        { model: Variety, as: 'variety', attributes: ['name', 'code'] }
      ]
    });

    if (!kunchinittu) {
      return res.status(404).json({ error: 'Kunchinittu not found' });
    }

    const where = {
      [Op.or]: [
        { toKunchinintuId: id },
        { fromKunchinintuId: id }
      ],
      status: { [Op.in]: ['approved', 'admin-approved'] }
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const transactions = await Arrival.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety', 'isCleared', 'clearedAt'] }
      ],
      order: [['date', 'ASC'], ['createdAt', 'ASC']],
      limit: limitNum // Apply limit to prevent memory issues with large datasets
    });

    // Get all unique dates from transactions
    const transactionDates = [...new Set(transactions.map(t => t.date))].sort();

    // If dateFrom and dateTo are provided, fill in all dates between them (including dates with no transactions)
    let allDates = transactionDates;
    if (dateFrom && dateTo) {
      const startDate = new Date(dateFrom + 'T00:00:00');
      const endDate = new Date(dateTo + 'T00:00:00');
      allDates = [];
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        allDates.push(dateStr);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Fetch ALL outturn IDs linked to this kunchinittu (regardless of date filter)
    // This ensures rice productions show even if production shifting was before the filter range
    const allTransactionsForOutturns = await Arrival.findAll({
      where: {
        [Op.or]: [
          { toKunchinintuId: id },
          { fromKunchinintuId: id }
        ],
        status: { [Op.in]: ['approved', 'admin-approved'] },
        outturnId: { [Op.ne]: null }
      },
      attributes: ['outturnId'],
      raw: true
    });

    const outturnIds = [...new Set(allTransactionsForOutturns.map(t => t.outturnId))];

    // Fetch rice productions with date filtering to match the selected range
    const riceProductionWhere = {
      outturnId: { [Op.in]: outturnIds },
      status: 'approved'
    };

    // Apply date filter to rice productions as well
    if (dateFrom || dateTo) {
      riceProductionWhere.date = {};
      if (dateFrom) riceProductionWhere.date[Op.gte] = dateFrom;
      if (dateTo) riceProductionWhere.date[Op.lte] = dateTo;
    }

    const riceProductions = outturnIds.length > 0 ? await RiceProduction.findAll({
      where: riceProductionWhere,
      attributes: ['outturnId', 'date', 'bags', 'productType', 'paddyBagsDeducted', 'quantityQuintals'],
      include: [
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] }
      ],
      order: [['date', 'ASC']]
    }) : [];

    // IMPORTANT: Merge rice production dates into allDates
    // This ensures days with only rice production (no arrivals) are included
    const riceProductionDates = [...new Set(riceProductions.map(rp => rp.date))];
    allDates = [...new Set([...allDates, ...riceProductionDates])].sort();

    // Build daily ledger with opening/closing stock
    const dailyLedger = [];
    let runningStock = {}; // { 'variety-outturnCode': { variety, bags, netWeight, outturnCode, warehouse } }

    // Track production shifting per outturn-variety combination
    let productionShiftingTracker = {}; // { outturnId-variety: { totalShifted, totalConsumed, remainingBags } }

    // Initialize cumulative tracking variables
    let cumulativeProductionShifting = {};
    let cumulativeRiceProduction = {};


    allDates.forEach(date => {
      const dayTransactions = transactions.filter(t => t.date === date);

      // Calculate opening stock FIRST (copy of previous closing) - this is the stock at the start of the day
      const openingStock = JSON.parse(JSON.stringify(runningStock));

      // INWARD = All transactions coming TO this kunchinittu (Purchase + Shifting in + Loose)
      const inward = dayTransactions.filter(t =>
        t.toKunchinintuId == id &&
        (t.movementType === 'purchase' || t.movementType === 'shifting' || t.movementType === 'loose')
      );

      // PRODUCTION SHIFTING and FOR PRODUCTION = Stays in mill, adds to opening stock
      const productionShifting = dayTransactions.filter(t =>
        t.fromKunchinintuId == id &&
        (t.movementType === 'production-shifting' || t.movementType === 'for-production')
      );

      // OUTWARD = Only normal shifting between kunchininttus (NOT production-shifting)
      const outward = dayTransactions.filter(t =>
        t.fromKunchinintuId == id &&
        t.movementType === 'shifting'
      );

      // Get all production shifting up to this date (needed for rice production tracking)
      const allProductionShiftingUpToDate = transactions.filter(t =>
        t.fromKunchinintuId == id &&
        (t.movementType === 'production-shifting' || t.movementType === 'for-production') &&
        t.date <= date
      );

      // Group inward transactions by variety and destination
      const inwardGroups = {};
      inward.forEach(txn => {
        const variety = txn.variety || 'Unknown';
        const toKunchinittu = txn.toKunchinittu?.code || kunchinittu.code;
        const toWarehouse = txn.toWarehouse?.name || kunchinittu.warehouse.name;
        const key = `${variety}-${toKunchinittu}-${toWarehouse}`;

        if (!inwardGroups[key]) {
          inwardGroups[key] = {
            variety,
            movementType: txn.movementType || 'purchase',
            bags: 0,
            netWeight: 0,
            broker: txn.broker,
            from: txn.movementType === 'purchase'
              ? txn.fromLocation
              : `${txn.fromKunchinittu?.code || ''}-${txn.fromWarehouse?.name || ''}`,
            to: `${toKunchinittu}-${toWarehouse}`,
            kunchinittu: toKunchinittu,
            warehouse: toWarehouse
          };
        }
        inwardGroups[key].bags += parseInt(txn.bags || 0);
        inwardGroups[key].netWeight += parseFloat(txn.netWeight || 0);
      });

      const inwardBifurcation = Object.values(inwardGroups);

      // Update cumulative production shifting - count ALL production shifting up to this date
      const allProductionShiftingUpToThisDate = transactions.filter(t =>
        t.fromKunchinintuId == id &&
        (t.movementType === 'production-shifting' || t.movementType === 'for-production') &&
        t.date <= date
      );

      // Reset cumulative for this date and recalculate from scratch
      cumulativeProductionShifting = {};
      allProductionShiftingUpToThisDate.forEach(txn => {
        const outturnId = txn.outturnId;
        if (outturnId) {
          if (!cumulativeProductionShifting[outturnId]) {
            cumulativeProductionShifting[outturnId] = 0;
          }
          cumulativeProductionShifting[outturnId] += parseInt(txn.bags || 0);
        }
      });

      // Calculate cumulative rice production up to this date
      cumulativeRiceProduction = {}; // Reset for this date
      riceProductions
        .filter(rp => rp.date <= date)
        .forEach(rp => {
          if (!cumulativeRiceProduction[rp.outturnId]) {
            cumulativeRiceProduction[rp.outturnId] = 0;
          }
          // Use paddyBagsDeducted if available, otherwise calculate from quintals × 3
          const paddyDeduction = rp.paddyBagsDeducted && rp.paddyBagsDeducted > 0
            ? parseInt(rp.paddyBagsDeducted)
            : Math.round(parseFloat(rp.quantityQuintals || 0) * 3);
          cumulativeRiceProduction[rp.outturnId] += paddyDeduction;
        });



      // Build production shifting display showing INDIVIDUAL entries for THIS DATE ONLY
      // DO NOT GROUP - add each transaction individually
      const productionShiftingBifurcation = productionShifting.map(txn => {
        const variety = txn.variety || 'Unknown';
        const outturnCode = txn.outturn?.code || 'out01';
        const fromKunchinittu = txn.fromKunchinittu?.code || kunchinittu.code;
        const fromWarehouse = txn.fromWarehouse?.name || kunchinittu.warehouse.name;

        return {
          variety,
          movementType: txn.movementType,
          bags: parseInt(txn.bags || 0),
          netWeight: parseFloat(txn.netWeight || 0),
          from: txn.movementType === 'for-production'
            ? 'Direct to Production'
            : `${fromKunchinittu} ${fromWarehouse}`,
          to: `to ${outturnCode}`,
          outturnCode: outturnCode,
          outturnId: txn.outturnId,
          wbNo: txn.wbNo,
          lorryNumber: txn.lorryNumber,
          date: txn.date
        };
      });

      // Group outward transactions (normal shifting between kunchininttus)
      const outwardGroups = {};
      outward.forEach(txn => {
        const variety = txn.variety || 'Unknown';
        const fromKunchinittu = txn.fromKunchinittu?.code || kunchinittu.code;
        const fromWarehouse = txn.fromWarehouse?.name || kunchinittu.warehouse.name;
        const toKunchinittu = txn.toKunchinittu?.code || '';
        const toWarehouse = txn.toWarehouseShift?.name || '';
        const key = `${variety}-${fromKunchinittu}-${toKunchinittu}`;

        if (!outwardGroups[key]) {
          outwardGroups[key] = {
            variety,
            movementType: 'shifting',
            bags: 0,
            netWeight: 0,
            from: `${fromKunchinittu} ${fromWarehouse}`,
            to: `${toKunchinittu} ${toWarehouse}`,
            fromKunchinittu,
            fromWarehouse,
            toKunchinittu,
            toWarehouse
          };
        }
        outwardGroups[key].bags += parseInt(txn.bags || 0);
        outwardGroups[key].netWeight += parseFloat(txn.netWeight || 0);
      });

      const outwardBifurcation = Object.values(outwardGroups);

      // Get rice production entries for this date (needed for stock calculation)
      const riceProductionForDate = riceProductions.filter(rp => rp.date === date);

      // Update running stock with inward transactions (Purchase + Shifting in)
      // Inward transactions don't have outurn codes (they're raw paddy)
      inwardBifurcation.forEach(item => {
        const stockKey = `${item.variety}-none`; // No outurn for raw paddy
        if (!runningStock[stockKey]) {
          runningStock[stockKey] = {
            variety: item.variety,
            bags: 0,
            netWeight: 0,
            outturnCode: null,
            warehouse: item.warehouse
          };
        }
        runningStock[stockKey].bags += item.bags;
        runningStock[stockKey].netWeight += item.netWeight;
      });

      // PRODUCTION SHIFTING: Move bags from "no outurn" to "with outurn" stock
      // This is a TRANSFER, not an addition - we remove from raw paddy and add to outurn batch
      productionShifting.forEach(txn => {
        const variety = txn.variety || 'Unknown';
        const outturnCode = txn.outturn?.code || null;
        const bags = parseInt(txn.bags || 0);
        const netWeight = parseFloat(txn.netWeight || 0);

        // REMOVE from stock without outurn (raw paddy)
        const rawStockKey = `${variety}-none`;
        if (runningStock[rawStockKey]) {
          runningStock[rawStockKey].bags -= bags;
          runningStock[rawStockKey].netWeight -= netWeight;

          // If stock goes to zero or negative, remove the entry
          if (runningStock[rawStockKey].bags <= 0) {
            delete runningStock[rawStockKey];
          }
        }

        // ADD to stock with outurn code
        const outturnStockKey = `${variety}-${outturnCode || 'none'}`;
        if (!runningStock[outturnStockKey]) {
          runningStock[outturnStockKey] = {
            variety: variety,
            bags: 0,
            netWeight: 0,
            outturnCode: outturnCode,
            warehouse: kunchinittu.warehouse.name
          };
        }
        runningStock[outturnStockKey].bags += bags;
        runningStock[outturnStockKey].netWeight += netWeight;
      });

      // SUBTRACT rice production consumed TODAY
      // This reduces the stock when paddy is actually consumed
      // Track consumption by outurn code
      riceProductionForDate.forEach(rp => {
        // Find the variety and outurn from the production shifting transaction
        const outturnTxn = allProductionShiftingUpToDate.find(t => t.outturnId === rp.outturnId);
        if (outturnTxn) {
          const variety = outturnTxn.variety || 'Unknown';
          const outturnCode = outturnTxn.outturn?.code || null;
          const stockKey = `${variety}-${outturnCode || 'none'}`;

          if (!runningStock[stockKey]) {
            runningStock[stockKey] = {
              variety: variety,
              bags: 0,
              netWeight: 0,
              outturnCode: outturnCode,
              warehouse: kunchinittu.warehouse.name
            };
          }
          // Subtract consumed bags from the specific outurn batch
          runningStock[stockKey].bags -= parseInt(rp.paddyBagsDeducted || 0);
          // Estimate net weight reduction (proportional to bags)
          const avgWeightPerBag = outturnTxn.netWeight / outturnTxn.bags;
          runningStock[stockKey].netWeight -= avgWeightPerBag * parseInt(rp.paddyBagsDeducted || 0);
        }
      });

      // SUBTRACT outward transactions (normal shifting between kunchininttus)
      // Outward transactions don't have outurn codes (raw paddy shifting)
      outwardBifurcation.forEach(item => {
        const stockKey = `${item.variety}-none`; // No outurn for raw paddy
        if (!runningStock[stockKey]) {
          runningStock[stockKey] = {
            variety: item.variety,
            bags: 0,
            netWeight: 0,
            outturnCode: null,
            warehouse: kunchinittu.warehouse.name
          };
        }
        runningStock[stockKey].bags -= item.bags;
        runningStock[stockKey].netWeight -= item.netWeight;
      });

      // Round netWeight
      Object.keys(runningStock).forEach(stockKey => {
        runningStock[stockKey].netWeight = parseFloat(runningStock[stockKey].netWeight.toFixed(2));
      });

      const closingStock = JSON.parse(JSON.stringify(runningStock));

      // Group rice production entries for display with outurn codes and variety
      const riceProductionGroups = {};

      riceProductionForDate.forEach(rp => {
        // Find the outturn code and variety for this production
        const outturnTxn = allProductionShiftingUpToDate.find(t => t.outturnId === rp.outturnId);
        const outturnCode = outturnTxn?.outturn?.code || 'out01';
        const variety = outturnTxn?.variety || 'Unknown';
        const key = `${variety}-${outturnCode}-${rp.productType}`;

        if (!riceProductionGroups[key]) {
          riceProductionGroups[key] = {
            bags: 0,
            variety: variety,
            outturnCode: outturnCode,
            productType: rp.productType,
            description: `${rp.productType}`,
            warehouse: kunchinittu.warehouse.name
          };
        }
        const paddyDeduction = rp.paddyBagsDeducted && rp.paddyBagsDeducted > 0
          ? parseInt(rp.paddyBagsDeducted)
          : Math.round(parseFloat(rp.quantityQuintals || 0) * 3);
        riceProductionGroups[key].bags += paddyDeduction;
      });

      const riceProductionEntries = Object.values(riceProductionGroups);

      dailyLedger.push({
        date,
        openingStock: Object.values(openingStock),
        inward: inwardBifurcation.map(item => ({
          ...item,
          netWeight: parseFloat(item.netWeight.toFixed(2))
        })),
        productionShifting: productionShiftingBifurcation.map(item => ({
          ...item,
          netWeight: parseFloat(item.netWeight.toFixed(2))
        })),
        riceProduction: riceProductionEntries, // Add rice production entries
        outward: outwardBifurcation.map(item => ({
          ...item,
          netWeight: parseFloat(item.netWeight.toFixed(2))
        })),
        closingStock: Object.values(closingStock),
        openingTotal: Object.values(openingStock).reduce((sum, v) => sum + v.bags, 0),
        closingTotal: Object.values(closingStock).reduce((sum, v) => sum + v.bags, 0)
      });
    });

    res.json({
      kunchinittu: {
        id: kunchinittu.id,
        name: kunchinittu.name,
        code: kunchinittu.code,
        warehouse: kunchinittu.warehouse
      },
      dailyLedger
    });
  } catch (error) {
    console.error('Get paddy stock error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Failed to fetch paddy stock',
      details: error.message
    });
  }
});

// Export Paddy Stock to PDF
router.get('/paddy-stock/:id/pdf', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo } = req.query;

    // Get the same data as the paddy-stock route
    const kunchinittu = await Kunchinittu.findByPk(id, {
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['name', 'code'] },
        { model: Variety, as: 'variety', attributes: ['name', 'code'] }
      ]
    });

    if (!kunchinittu) {
      return res.status(404).json({ error: 'Kunchinittu not found' });
    }

    const where = {
      [Op.or]: [
        { toKunchinintuId: id },
        { fromKunchinintuId: id }
      ],
      status: 'approved'
    };

    if (dateFrom || dateTo) {
      where.date = {};
      if (dateFrom) where.date[Op.gte] = dateFrom;
      if (dateTo) where.date[Op.lte] = dateTo;
    }

    const transactions = await Arrival.findAll({
      where,
      include: [
        { model: User, as: 'creator', attributes: ['username'] },
        { model: Kunchinittu, as: 'toKunchinittu', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'fromWarehouse', attributes: ['name', 'code'] },
        { model: Warehouse, as: 'toWarehouseShift', attributes: ['name', 'code'] },
        { model: Kunchinittu, as: 'fromKunchinittu', attributes: ['name', 'code'] },
        { model: Outturn, as: 'outturn', attributes: ['code', 'allottedVariety'] }
      ],
      order: [['date', 'ASC'], ['createdAt', 'ASC']]
    });

    // Fetch all rice productions for outturns in this date range
    const outturnIds = [...new Set(transactions
      .filter(t => t.outturnId)
      .map(t => t.outturnId))];

    const riceProductions = outturnIds.length > 0 ? await RiceProduction.findAll({
      where: {
        outturnId: { [Op.in]: outturnIds },
        status: 'approved'
      },
      attributes: ['outturnId', 'date', 'bags', 'paddyBagsDeducted', 'quantityQuintals'],
      order: [['date', 'ASC']]
    }) : [];

    // Build daily ledger (same logic as paddy-stock route)
    const allDates = [...new Set(transactions.map(t => t.date))].sort();
    const dailyLedger = [];
    let runningStock = {};
    let cumulativeProductionShifting = {};
    let cumulativeRiceProduction = {};

    allDates.forEach(date => {
      const dayTransactions = transactions.filter(t => t.date === date);

      const inward = dayTransactions.filter(t =>
        t.toKunchinintuId == id &&
        (t.movementType === 'purchase' || t.movementType === 'shifting' || t.movementType === 'loose')
      );

      const productionShifting = dayTransactions.filter(t =>
        t.fromKunchinintuId == id &&
        (t.movementType === 'production-shifting' || t.movementType === 'for-production')
      );

      const outward = dayTransactions.filter(t =>
        t.fromKunchinintuId == id &&
        t.movementType === 'shifting'
      );

      const openingStock = JSON.parse(JSON.stringify(runningStock));

      // Group inward
      const inwardGroups = {};
      inward.forEach(txn => {
        const variety = txn.variety || 'Unknown';
        const movementType = txn.movementType || 'purchase';
        const key = `${variety}-${movementType}`;

        if (!inwardGroups[key]) {
          inwardGroups[key] = {
            variety,
            movementType,
            bags: 0,
            netWeight: 0,
            broker: txn.broker,
            from: txn.movementType === 'purchase'
              ? txn.fromLocation
              : `${txn.fromKunchinittu?.code || ''}-${txn.fromWarehouse?.name || ''}`,
            to: `${kunchinittu.code}-${kunchinittu.warehouse.name}`
          };
        }
        inwardGroups[key].bags += parseInt(txn.bags || 0);
        inwardGroups[key].netWeight += parseFloat(txn.netWeight || 0);
      });

      const inwardBifurcation = Object.values(inwardGroups);

      // Build production shifting display showing INDIVIDUAL entries for THIS DATE ONLY
      // DO NOT GROUP - add each transaction individually
      const productionShiftingBifurcation = productionShifting.map(txn => {
        const variety = txn.variety || 'Unknown';
        const outturnCode = txn.outturn?.code || 'out01';
        const fromKunchinittu = txn.fromKunchinittu?.code || kunchinittu.code;
        const fromWarehouse = txn.fromWarehouse?.name || kunchinittu.warehouse.name;

        return {
          variety,
          movementType: txn.movementType,
          bags: parseInt(txn.bags || 0),
          netWeight: parseFloat(txn.netWeight || 0),
          from: txn.movementType === 'for-production'
            ? 'Direct to Production'
            : `${fromKunchinittu} ${fromWarehouse}`,
          to: `to ${outturnCode}`,
          outturnCode: outturnCode,
          outturnId: txn.outturnId
        };
      });

      // Group outward
      const outwardGroups = {};
      outward.forEach(txn => {
        const variety = txn.variety || 'Unknown';
        const to = `${txn.toKunchinittu?.code || ''} ${txn.toWarehouseShift?.name || ''}`;
        const key = `${variety}-${to}`;

        if (!outwardGroups[key]) {
          outwardGroups[key] = {
            variety,
            movementType: 'shifting',
            bags: 0,
            netWeight: 0,
            from: `${kunchinittu.code} ${kunchinittu.warehouse?.name || 'Unknown'}`,
            to
          };
        }
        outwardGroups[key].bags += parseInt(txn.bags || 0);
        outwardGroups[key].netWeight += parseFloat(txn.netWeight || 0);
      });

      const outwardBifurcation = Object.values(outwardGroups);

      // Update running stock
      inwardBifurcation.forEach(item => {
        if (!runningStock[item.variety]) {
          runningStock[item.variety] = { variety: item.variety, bags: 0, netWeight: 0 };
        }
        runningStock[item.variety].bags += item.bags;
        runningStock[item.variety].netWeight += item.netWeight;
      });

      // PRODUCTION SHIFTING: Do NOT add or subtract from running stock
      // Production shifting entries are shown for display only on the date they were entered
      // They don't affect the closing stock calculation

      outwardBifurcation.forEach(item => {
        if (!runningStock[item.variety]) {
          runningStock[item.variety] = { variety: item.variety, bags: 0, netWeight: 0 };
        }
        runningStock[item.variety].bags -= item.bags;
        runningStock[item.variety].netWeight -= item.netWeight;
      });

      Object.keys(runningStock).forEach(variety => {
        runningStock[variety].netWeight = parseFloat(runningStock[variety].netWeight.toFixed(2));
      });

      const closingStock = JSON.parse(JSON.stringify(runningStock));

      dailyLedger.push({
        date,
        openingStock: Object.values(openingStock),
        inward: inwardBifurcation,
        productionShifting: productionShiftingBifurcation,
        outward: outwardBifurcation,
        closingStock: Object.values(closingStock),
        openingTotal: Object.values(openingStock).reduce((sum, v) => sum + v.bags, 0),
        closingTotal: Object.values(closingStock).reduce((sum, v) => sum + v.bags, 0)
      });
    });

    // Generate PDF
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'portrait' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=paddy_stock_${kunchinittu.code}_${Date.now()}.pdf`);

    doc.pipe(res);

    // Header
    doc.fontSize(16).font('Helvetica-Bold')
      .text('Paddy Stock Ledger', { align: 'center' });
    doc.fontSize(10).font('Helvetica')
      .text(`Kunchinittu: ${kunchinittu.code} | Warehouse: ${kunchinittu.warehouse?.name || 'Unknown'}`, { align: 'center' });
    doc.moveDown();

    // Daily ledger entries
    dailyLedger.forEach((day, dayIdx) => {
      if (dayIdx > 0 && doc.y > 700) {
        doc.addPage();
      }

      // Date header
      doc.fontSize(12).font('Helvetica-Bold')
        .fillColor('#4a90e2')
        .text(new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }));
      doc.moveDown(0.3);

      // Opening stock - Format: bags     -     variety     -     outturnCode(warehouse) or bags     -     variety     -     (warehouse)
      if (day.openingStock.length > 0) {
        doc.fontSize(9).font('Helvetica');
        day.openingStock.forEach(stock => {
          const outturnDisplay = stock.outturnCode ? stock.outturnCode : '';
          doc.fillColor('#000000').text(`${stock.bags}     -     ${stock.variety}     -     ${outturnDisplay}(${stock.warehouse || kunchinittu.warehouse.name})`, { indent: 20 });
        });
        doc.font('Helvetica-Bold').text(`${day.openingTotal} Opening Stock`, { indent: 20 });
        doc.moveDown(0.5);
      }

      // Inward (Green) - Format: +bags     -     broker     -     variety     -     outturnCode(warehouse) or (warehouse)
      if (day.inward.length > 0) {
        day.inward.forEach(entry => {
          const outturnDisplay = entry.outturnCode ? entry.outturnCode : '';
          doc.fontSize(9).font('Helvetica')
            .fillColor('#10b981')
            .text(`+${entry.bags}     -     ${entry.broker || '-'}     -     ${entry.variety}     -     ${outturnDisplay}(${entry.warehouse})`, { indent: 20 });
        });
        doc.moveDown(0.3);
      }

      // Production Shifting (Orange) - Format: bags     -     variety     -     outturn
      if (day.productionShifting.length > 0) {
        day.productionShifting.forEach(entry => {
          doc.fontSize(9).font('Helvetica')
            .fillColor('#f97316')
            .text(`${entry.remainingBags}     -     ${entry.variety}     -     ${entry.outturnCode}`, { indent: 20 });
        });
        doc.moveDown(0.3);
      }

      // Rice Production Consumption (Red) - Format: -bags     -     variety     -     outturnCode(warehouse)
      if (day.riceProduction && day.riceProduction.length > 0) {
        day.riceProduction.forEach(entry => {
          doc.fontSize(9).font('Helvetica')
            .fillColor('#dc2626')
            .text(`-${entry.bags}     -     ${entry.variety}     -     ${entry.outturnCode}(${entry.warehouse})`, { indent: 20 });
        });
        doc.moveDown(0.3);
      }

      // Outward (Purple) - Format: -bags     -     variety     -     from to to
      if (day.outward.length > 0) {
        day.outward.forEach(entry => {
          doc.fontSize(9).font('Helvetica')
            .fillColor('#a855f7')
            .text(`-${entry.bags}     -     ${entry.variety}     -     ${entry.from} to ${entry.to}`, { indent: 20 });
        });
        doc.moveDown(0.3);
      }

      // Closing stock - Format: bags     -     variety     -     outturnCode(warehouse) or bags     -     variety     -     (warehouse)
      if (day.closingStock.length > 0) {
        doc.fontSize(9).font('Helvetica');
        day.closingStock.forEach(stock => {
          const outturnDisplay = stock.outturnCode ? stock.outturnCode : '';
          doc.fillColor('#000000').text(`${stock.bags}     -     ${stock.variety}     -     ${outturnDisplay}(${stock.warehouse || kunchinittu.warehouse.name})`, { indent: 20 });
        });
        doc.font('Helvetica-Bold').text(`${day.closingTotal} Closing Stock`, { indent: 20 });
        doc.moveDown(1);
      }
    });

    doc.end();
  } catch (error) {
    console.error('Paddy stock PDF export error:', error);
    res.status(500).json({ error: 'Failed to generate paddy stock PDF' });
  }
});

// Get all Kunchinittus for ledger selection (includes closed ones for viewing history)
router.get('/kunchinittus', auth, async (req, res) => {
  try {
    const kunchinittus = await Kunchinittu.findAll({
      where: { isActive: true },
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['name', 'code'] }
      ],
      order: [['isClosed', 'ASC'], ['name', 'ASC']] // Open ones first, then closed
    });

    res.json({ kunchinittus });
  } catch (error) {
    console.error('Get kunchinittus for ledger error:', error);
    // Return empty array instead of error
    res.json({ kunchinittus: [] });
  }
});

// Close a Kunchinittu (Admin only)
// When closed: Cannot add new entries, won't appear in dropdowns for new arrivals
// But can still view the ledger history
// IMPORTANT: Calculates and stores remaining bags (inward - outward) for stock deduction
router.post('/kunchinittu/:id/close', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const kunchinittu = await Kunchinittu.findByPk(id, {
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['name', 'code'] }
      ]
    });

    if (!kunchinittu) {
      return res.status(404).json({ error: 'Kunchinittu not found' });
    }

    if (kunchinittu.isClosed) {
      return res.status(400).json({ error: 'Kunchinittu is already closed' });
    }

    // Calculate remaining bags (inward - outward)
    // INWARD = All transactions coming TO this kunchinittu (Purchase + Shifting in + Loose)
    const inwardTransactions = await Arrival.findAll({
      where: {
        toKunchinintuId: id,
        movementType: { [Op.in]: ['purchase', 'shifting', 'loose'] },
        status: { [Op.in]: ['approved', 'admin-approved'] }
      },
      attributes: ['bags']
    });
    const totalInward = inwardTransactions.reduce((sum, t) => sum + parseInt(t.bags || 0), 0);

    // OUTWARD = Only normal shifting between kunchininttus (NOT production-shifting)
    const outwardTransactions = await Arrival.findAll({
      where: {
        fromKunchinintuId: id,
        movementType: 'shifting',
        status: { [Op.in]: ['approved', 'admin-approved'] }
      },
      attributes: ['bags']
    });
    const totalOutward = outwardTransactions.reduce((sum, t) => sum + parseInt(t.bags || 0), 0);

    // Production shifting transactions (moved to production, not outward)
    const productionShiftingTransactions = await Arrival.findAll({
      where: {
        fromKunchinintuId: id,
        movementType: { [Op.in]: ['production-shifting', 'for-production'] },
        status: { [Op.in]: ['approved', 'admin-approved'] }
      },
      attributes: ['bags']
    });
    const totalProductionShifting = productionShiftingTransactions.reduce((sum, t) => sum + parseInt(t.bags || 0), 0);

    // Remaining bags = Inward - Outward - Production Shifting already consumed
    // Note: Production shifting moves bags to outturn, so it's a deduction from kunchinittu
    const remainingBags = totalInward - totalOutward - totalProductionShifting;

    console.log(`📊 Kunchinittu ${kunchinittu.code} calculation:
      Inward: ${totalInward}
      Outward: ${totalOutward}
      Production Shifting: ${totalProductionShifting}
      Remaining: ${remainingBags}`);

    // Close the Kunchinittu with remaining bags
    await kunchinittu.update({
      isClosed: true,
      closedAt: new Date(),
      closedBy: req.user.userId,
      closedRemainingBags: remainingBags > 0 ? remainingBags : 0
    });

    console.log(`✅ Kunchinittu ${kunchinittu.code} closed by user ${req.user.userId} with ${remainingBags} remaining bags`);

    res.json({
      message: `Kunchinittu ${kunchinittu.code} has been closed successfully`,
      kunchinittu: {
        id: kunchinittu.id,
        code: kunchinittu.code,
        name: kunchinittu.name,
        isClosed: true,
        closedAt: kunchinittu.closedAt,
        closedRemainingBags: remainingBags > 0 ? remainingBags : 0
      }
    });
  } catch (error) {
    console.error('Close kunchinittu error:', error);
    res.status(500).json({ error: 'Failed to close kunchinittu' });
  }
});

// Reopen a Kunchinittu (Admin only)
router.post('/kunchinittu/:id/reopen', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const kunchinittu = await Kunchinittu.findByPk(id);

    if (!kunchinittu) {
      return res.status(404).json({ error: 'Kunchinittu not found' });
    }

    if (!kunchinittu.isClosed) {
      return res.status(400).json({ error: 'Kunchinittu is not closed' });
    }

    // Reopen the Kunchinittu
    await kunchinittu.update({
      isClosed: false,
      closedAt: null,
      closedBy: null
    });

    console.log(`✅ Kunchinittu ${kunchinittu.code} reopened by admin ${req.user.userId}`);

    res.json({
      message: `Kunchinittu ${kunchinittu.code} has been reopened successfully`,
      kunchinittu: {
        id: kunchinittu.id,
        code: kunchinittu.code,
        name: kunchinittu.name,
        isClosed: false
      }
    });
  } catch (error) {
    console.error('Reopen kunchinittu error:', error);
    res.status(500).json({ error: 'Failed to reopen kunchinittu' });
  }
});

module.exports = router;