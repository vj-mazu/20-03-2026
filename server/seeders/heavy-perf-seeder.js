/**
 * Heavy Performance Seeder V4 (Date Range Version)
 * 
 * Objectives:
 * 1. Expand baseline data: 100 Brokers, 40 Varieties, 70 Kunchinittus, etc.
 * 2. Seed 400,000 COMPLETED sample entry workflows.
 * 3. Use bulkCreate and batching for maximum speed.
 * 4. Use 'approved' status and seed PurchaseRate for total visibility.
 * 5. DATE RANGE: Distribute records from Jan 2025 to Today.
 * 6. NO CLEANUP: Optimized for fresh database seeding.
 */

require('dotenv').config();
const {
    sequelize,
    User,
    Broker,
    Variety,
    RiceVariety,
    Warehouse,
    Kunchinittu,
    Outturn,
    SampleEntry,
    QualityParameters,
    LotAllotment,
    PhysicalInspection,
    InventoryData,
    FinancialCalculation,
    Arrival,
    PurchaseRate
} = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');

const TOTAL_WORKFLOWS = 400000;
const BATCH_SIZE = 5000;

// Helper to get random date between Jan 1, 2025 and Feb 15, 2026
function getRandomDate() {
    const start = new Date('2025-01-01').getTime();
    const end = new Date().getTime();
    return new Date(start + Math.random() * (end - start));
}

async function seed() {
    console.log('🚀 Starting Final Heavy Performance Seeder V4 (Date Range: Jan 2025 - Present)...');
    const startTime = Date.now();

    try {
        await sequelize.authenticate();
        console.log('✅ Connected to database');

        // 1. Baseline Data Expansion
        console.log('\n📦 Expanding Baseline Data...');

        // Users
        const roles = ['staff', 'manager', 'admin', 'quality_supervisor', 'physical_supervisor', 'inventory_staff', 'financial_account'];
        const users = [];
        for (const role of roles) {
            const existing = await User.findOne({ where: { role } });
            if (!existing) {
                users.push({
                    username: `user_${role}`,
                    password: 'password123',
                    role,
                    isActive: true
                });
            }
        }
        if (users.length > 0) await User.bulkCreate(users);
        const dbUsers = await User.findAll();
        const userMap = {}; // role -> id
        dbUsers.forEach(u => { userMap[u.role] = u.id; });
        console.log('✅ Users prepared');

        // Brokers
        const currentBrokers = await Broker.count();
        if (currentBrokers < 100) {
            const brokersToAdd = [];
            for (let i = currentBrokers + 1; i <= 100; i++) {
                brokersToAdd.push({ name: `Broker ${i}`, isActive: true });
            }
            await Broker.bulkCreate(brokersToAdd);
        }
        const dbBrokers = await Broker.findAll({ attributes: ['id', 'name'] });
        console.log('✅ 100 Brokers prepared');

        // Varieties (Paddy)
        const currentVarieties = await Variety.count();
        if (currentVarieties < 40) {
            const varietiesToAdd = [];
            for (let i = currentVarieties + 1; i <= 40; i++) {
                varietiesToAdd.push({ name: `Paddy Variety ${i}`, code: `PV${i}`, isActive: true });
            }
            await Variety.bulkCreate(varietiesToAdd);
        }
        const dbVarieties = await Variety.findAll({ attributes: ['id', 'name'] });
        console.log('✅ 40 Paddy Varieties prepared');

        // Rice Varieties
        const currentRiceVarieties = await RiceVariety.count();
        if (currentRiceVarieties < 40) {
            const riceVarietiesToAdd = [];
            for (let i = currentRiceVarieties + 1; i <= 40; i++) {
                riceVarietiesToAdd.push({ name: `Rice Variety ${i}`, code: `RV${i}`, isActive: true });
            }
            await RiceVariety.bulkCreate(riceVarietiesToAdd);
        }
        console.log('✅ 40 Rice Varieties prepared');

        // Warehouses
        const currentWarehouses = await Warehouse.count();
        if (currentWarehouses < 3) {
            const warehousesToAdd = [];
            for (let i = currentWarehouses + 1; i <= 3; i++) {
                warehousesToAdd.push({ name: `Warehouse ${i}`, code: `WH${i}`, isActive: true });
            }
            await Warehouse.bulkCreate(warehousesToAdd);
        }
        const dbWarehouses = await Warehouse.findAll({ attributes: ['id'] });
        console.log('✅ 3 Warehouses prepared');

        // Kunchinittus
        const currentKunch = await Kunchinittu.count();
        if (currentKunch < 70) {
            const kunchToAdd = [];
            for (let i = currentKunch + 1; i <= 70; i++) {
                kunchToAdd.push({
                    name: `Kunchinittu ${i}`,
                    code: `K${i}`,
                    warehouseId: dbWarehouses[i % dbWarehouses.length].id,
                    isActive: true
                });
            }
            await Kunchinittu.bulkCreate(kunchToAdd);
        }
        const dbKunch = await Kunchinittu.findAll({ attributes: ['id'] });
        console.log('✅ 70 Kunchinittus prepared');

        // Outturns
        const currentOutturns = await Outturn.count();
        if (currentOutturns < 20) {
            const outturnsToAdd = [];
            let nextOtCodeIndex = currentOutturns + 1;
            for (let i = currentOutturns + 1; i <= 20; i++) {
                outturnsToAdd.push({
                    code: `OT-SEED-${nextOtCodeIndex++}`,
                    allottedVariety: dbVarieties[i % dbVarieties.length].name,
                    type: i % 2 === 0 ? 'Raw' : 'Steam',
                    createdBy: userMap['admin'] || 1
                });
            }
            await Outturn.bulkCreate(outturnsToAdd, { hooks: false });
        }
        const dbOutturns = await Outturn.findAll({ attributes: ['id'] });
        console.log('✅ 20 Outturns prepared');

        // 2. High Volume Workflow Seeding
        const runId = Date.now().toString().slice(-6);
        console.log(`\n⏳ Seeding ${TOTAL_WORKFLOWS} Completed Workflows in batches of ${BATCH_SIZE}... (Run ID: ${runId})`);

        for (let b = 0; b < TOTAL_WORKFLOWS / BATCH_SIZE; b++) {
            const batchStartTime = Date.now();
            const sampleEntriesArr = [];
            const qualityParamsArr = [];
            const lotAllotmentsArr = [];
            const physicalInspectionsArr = [];
            const inventoryDataArr = [];
            const financialCalcsArr = [];
            const arrivalsArr = [];

            for (let i = 0; i < BATCH_SIZE; i++) {
                const id = uuidv4();
                const qualityId = uuidv4();
                const allotmentId = uuidv4();
                const inspectionId = uuidv4();
                const invId = uuidv4();
                const index = b * BATCH_SIZE + i;
                const randomDate = getRandomDate();

                const broker = dbBrokers[index % dbBrokers.length];
                const variety = dbVarieties[index % dbVarieties.length];
                const kunch = dbKunch[index % dbKunch.length];
                const outturn = dbOutturns[index % dbOutturns.length];

                // Sample Entry
                sampleEntriesArr.push({
                    id,
                    createdByUserId: userMap['staff'] || 1,
                    entryDate: randomDate,
                    brokerName: broker.name,
                    variety: variety.name,
                    partyName: `P-${runId}-${index}`,
                    location: `Loc-${index}`,
                    bags: 100 + (index % 500),
                    entryType: 'CREATE_NEW',
                    workflowStatus: 'COMPLETED',
                    finalPrice: 2500.00
                });

                // Quality Parameters
                qualityParamsArr.push({
                    id: qualityId,
                    sampleEntryId: id,
                    reportedByUserId: userMap['quality_supervisor'] || 1,
                    moisture: 14.5,
                    cutting1: 2,
                    cutting2: 3,
                    bend: 1.5,
                    mixS: 2.0,
                    mixL: 1.0,
                    mix: 3.0,
                    kandu: 0.5,
                    oil: 0.2,
                    sk: 1.0,
                    grainsCount: 1000,
                    wbR: 1.5,
                    wbBk: 0.5,
                    wbT: 2.0,
                    paddyWb: 1.0,
                    reportedBy: 'Quality Tester'
                });

                // Lot Allotment
                lotAllotmentsArr.push({
                    id: allotmentId,
                    sampleEntryId: id,
                    allottedByManagerId: userMap['manager'] || 1,
                    allottedToSupervisorId: userMap['physical_supervisor'] || 1,
                    allottedAt: randomDate
                });

                // Physical Inspection
                physicalInspectionsArr.push({
                    id: inspectionId,
                    sampleEntryId: id,
                    lotAllotmentId: allotmentId,
                    reportedByUserId: userMap['physical_supervisor'] || 1,
                    inspectionDate: randomDate,
                    bags: 100 + (index % 500),
                    lorryNumber: `KA-01-${runId}-${i}`,
                    cutting1: 2,
                    cutting2: 3,
                    bend: 1.5,
                    isComplete: true
                });

                // Inventory Data
                inventoryDataArr.push({
                    id: invId,
                    physicalInspectionId: inspectionId,
                    recordedByUserId: userMap['inventory_staff'] || 1,
                    entryDate: randomDate,
                    variety: variety.name,
                    bags: 100 + (index % 500),
                    moisture: 14.5,
                    wbNumber: `WB-${runId}-${index}`,
                    grossWeight: 5000.00,
                    tareWeight: 1000.00,
                    netWeight: 4000.00,
                    location: 'WAREHOUSE',
                    kunchinittuId: kunch.id
                });

                // Financial Calculation
                financialCalcsArr.push({
                    id: uuidv4(),
                    inventoryDataId: invId,
                    suteRate: 10.00,
                    suteType: 'PER_BAG',
                    totalSute: 1000.00,
                    suteNetWeight: 3900.00,
                    baseRateType: 'PD_WB',
                    baseRateUnit: 'PER_QUINTAL',
                    baseRateValue: 2500.00,
                    baseRateTotal: 100000.00,
                    brokerageRate: 1.00,
                    brokerageUnit: 'PER_QUINTAL',
                    brokerageTotal: 40.00,
                    lfinRate: 0.5,
                    lfinUnit: 'PER_QUINTAL',
                    lfinTotal: 20.00,
                    hamaliRate: 5.00,
                    hamaliUnit: 'PER_BAG',
                    hamaliTotal: 500.00,
                    totalAmount: 100560.00,
                    average: 2514.00,
                    ownerCalculatedBy: userMap['admin'] || 1
                });

                // Arrival
                arrivalsArr.push({
                    slNo: `A-DEF-${runId}-${index}`,
                    date: randomDate,
                    movementType: 'purchase',
                    broker: broker.name,
                    variety: variety.name,
                    bags: 100 + (index % 500),
                    fromLocation: `Loc-${index}`,
                    toKunchinintuId: kunch.id,
                    wbNo: `WB-FNL-${runId}-${index}`,
                    grossWeight: 5000.00,
                    tareWeight: 1000.00,
                    netWeight: 4000.00,
                    lorryNumber: `KA-01-${runId}-${i}`,
                    status: 'approved',
                    createdBy: userMap['staff'] || 1,
                    approvedBy: userMap['manager'] || 1,
                    approvedAt: randomDate,
                    adminApprovedBy: userMap['admin'] || 1,
                    adminApprovedAt: randomDate
                });
            }

            // Create Arrivals first to get IDs
            const createdArrivals = await Arrival.bulkCreate(arrivalsArr, { hooks: false, logging: false });

            // Create Purchase Rates linked to Arrivals
            const purchaseRatesArr = createdArrivals.map((arrival, idx) => {
                return {
                    arrivalId: arrival.id,
                    sute: 10.00,
                    suteCalculationMethod: 'per_bag',
                    baseRate: 2500.00,
                    rateType: 'CDWB',
                    baseRateCalculationMethod: 'per_quintal',
                    h: 5.00,
                    b: 2.00,
                    lf: 1.00,
                    egb: 0,
                    amountFormula: '2500 * 40',
                    totalAmount: 100000.00,
                    averageRate: 2500.00,
                    createdBy: userMap['admin'] || 1,
                    status: 'approved',
                    adminApprovedBy: userMap['admin'] || 1,
                    adminApprovedAt: arrival.date
                };
            });

            await sequelize.transaction(async (t) => {
                await SampleEntry.bulkCreate(sampleEntriesArr, { transaction: t, hooks: false, logging: false });
                await QualityParameters.bulkCreate(qualityParamsArr, { transaction: t, hooks: false, logging: false });
                await LotAllotment.bulkCreate(lotAllotmentsArr, { transaction: t, hooks: false, logging: false });
                await PhysicalInspection.bulkCreate(physicalInspectionsArr, { transaction: t, hooks: false, logging: false });
                await InventoryData.bulkCreate(inventoryDataArr, { transaction: t, hooks: false, logging: false });
                await FinancialCalculation.bulkCreate(financialCalcsArr, { transaction: t, hooks: false, logging: false });
                await PurchaseRate.bulkCreate(purchaseRatesArr, { transaction: t, hooks: false, logging: false });
            });

            const batchEndTime = Date.now();
            console.log(`✅ Batch ${b + 1}/${TOTAL_WORKFLOWS / BATCH_SIZE} completed in ${(batchEndTime - batchStartTime) / 1000}s`);
        }

        const endTime = Date.now();
        console.log(`\n✨ DONE! Seeded ${TOTAL_WORKFLOWS} workflows in ${(endTime - startTime) / 1000}s`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
