/**
 * Render Lightweight Seeder (25,000 Records) - SCHEMA PERFECT
 * 
 * Satisfies EVERY not-null constraint and matches production models exactly.
 * Uses DIRECT imports for maximum reliability on Render.
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const User = require('../models/User');
const Broker = require('../models/Broker');
const { Warehouse, Kunchinittu, Variety } = require('../models/Location');
const RiceVariety = require('../models/RiceVariety');
const SampleEntry = require('../models/SampleEntry');
const QualityParameters = require('../models/QualityParameters');
const LotAllotment = require('../models/LotAllotment');
const PhysicalInspection = require('../models/PhysicalInspection');
const InventoryData = require('../models/InventoryData');
const Arrival = require('../models/Arrival');
const PurchaseRate = require('../models/PurchaseRate');
const { v4: uuidv4 } = require('uuid');

const TOTAL_WORKFLOWS = 25000;
const BATCH_SIZE = 500;

function getRandomDate() {
    const start = new Date('2025-01-01').getTime();
    const end = new Date().getTime();
    return new Date(start + Math.random() * (end - start));
}

async function seed() {
    console.log('🌱 Start: SCHEMA PERFECT Render Lightweight Seeder (25,000 Records)...');

    try {
        await sequelize.authenticate();
        console.log('📡 Database connected');

        // 1. Expand Baseline Data
        const roles = ['staff', 'manager', 'admin', 'quality_supervisor', 'physical_supervisor', 'inventory_staff', 'financial_account'];
        for (const role of roles) {
            await User.findOrCreate({
                where: { role },
                defaults: { username: `user_${role}`, password: 'password123', isActive: true }
            });
        }
        const users = await User.findAll();
        const userMap = {};
        users.forEach(u => { userMap[u.role] = u.id; });

        // Ensure baseline entities
        if (await Broker.count() < 10) {
            await Broker.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Broker ${i + 1}`, isActive: true })));
        }
        if (await Variety.count() < 10) {
            await Variety.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Variety ${i + 1}`, code: `V${i + 1}`, isActive: true })));
        }
        if (await RiceVariety.count() < 5) {
            await RiceVariety.bulkCreate(Array.from({ length: 5 }).map((_, i) => ({ name: `Rice ${i + 1}`, code: `R${i + 1}`, isActive: true })));
        }

        let wh = await Warehouse.findOne();
        if (!wh) {
            wh = await Warehouse.create({ name: 'Default WH', code: 'DWH' });
        }

        if (await Kunchinittu.count() < 10) {
            await Kunchinittu.bulkCreate(Array.from({ length: 10 }).map((_, i) => ({ name: `Kunchinittu ${i + 1}`, code: `K${i + 1}`, warehouseId: wh.id, isActive: true })));
        }

        const dbBrokers = await Broker.findAll();
        const dbVarieties = await Variety.findAll();
        const dbKunch = await Kunchinittu.findAll();

        const runId = Date.now().toString().slice(-4);

        for (let b = 0; b < Math.ceil(TOTAL_WORKFLOWS / BATCH_SIZE); b++) {
            const batchStart = Date.now();
            const workflowData = [];

            for (let i = 0; i < BATCH_SIZE; i++) {
                const index = (b * BATCH_SIZE) + i;
                if (index >= TOTAL_WORKFLOWS) break;

                const id = uuidv4();
                const randomDate = getRandomDate();
                const broker = dbBrokers[index % dbBrokers.length];
                const variety = dbVarieties[index % dbVarieties.length];
                const kunch = dbKunch[index % dbKunch.length];

                workflowData.push({ id, randomDate, broker, variety, kunch, index });
            }

            // 1. Sample Entries
            await SampleEntry.bulkCreate(workflowData.map(d => ({
                id: d.id,
                entryDate: d.randomDate,
                brokerName: d.broker.name,
                variety: d.variety.name,
                partyName: `Render-Party-${runId}-${d.index}`,
                bags: 100 + (d.index % 500),
                workflowStatus: 'COMPLETED',
                entryType: 'CREATE_NEW',
                createdByUserId: userMap['staff'] || 1,
                lotSelectionByUserId: userMap['manager'] || 1,
                finalReviewByUserId: userMap['admin'] || 1,
                location: 'Main Yard',
                sampleCollected: true
            })));

            // 2. Quality Parameters
            await QualityParameters.bulkCreate(workflowData.map(d => ({
                id: uuidv4(),
                sampleEntryId: d.id,
                reportedByUserId: userMap['quality_supervisor'] || 1,
                reportedBy: 'System Seeder',
                moisture: 14.50,
                cutting1: 3.50,
                cutting2: 2.50,
                bend: 1.20,
                mixS: 5.00,
                mixL: 2.00,
                mix: 7.00,
                kandu: 1.50,
                oil: 0.50,
                sk: 1.00,
                grainsCount: 1000,
                wbR: 1.20,
                wbBk: 0.50,
                wbT: 1.70,
                paddyWb: 0.80
            })));

            // 3. Lot Allotments
            const lotAllotmentsArr = workflowData.map(d => ({
                id: uuidv4(),
                sampleEntryId: d.id,
                allottedByManagerId: userMap['manager'] || 1,
                allottedToSupervisorId: userMap['physical_supervisor'] || 1,
                allottedAt: d.randomDate
            }));
            await LotAllotment.bulkCreate(lotAllotmentsArr);

            // 4. Physical Inspections
            const physicalInspectionsArr = workflowData.map((d, idx) => ({
                id: uuidv4(),
                sampleEntryId: d.id,
                lotAllotmentId: lotAllotmentsArr[idx].id,
                reportedByUserId: userMap['physical_supervisor'] || 1,
                inspectionDate: d.randomDate,
                bags: 100 + (d.index % 500),
                lorryNumber: `LR-${runId}-${d.index}`,
                cutting1: 3.5,
                bend: 1.2,
                isComplete: true
            }));
            await PhysicalInspection.bulkCreate(physicalInspectionsArr);

            // 5. Inventory Data
            const inventoryDataArr = workflowData.map((d, idx) => ({
                id: uuidv4(),
                physicalInspectionId: physicalInspectionsArr[idx].id,
                recordedByUserId: userMap['inventory_staff'] || 1,
                entryDate: d.randomDate,
                variety: d.variety.name,
                bags: 100 + (d.index % 500),
                moisture: 14.5,
                wbNumber: `WB-${runId}-${d.index}`,
                grossWeight: 50.00,
                tareWeight: 10.00,
                netWeight: 40.00,
                location: 'DIRECT_KUNCHINITTU',
                kunchinittuId: d.kunch.id
            }));
            await InventoryData.bulkCreate(inventoryDataArr);

            // 6. Arrivals
            const arrivalsArr = workflowData.map(d => ({
                slNo: `RL-${runId}-${d.index}-${uuidv4().slice(0, 4)}`.slice(0, 20),
                date: d.randomDate,
                movementType: 'purchase',
                broker: d.broker.name,
                variety: d.variety.name,
                bags: 100 + (d.index % 500),
                toKunchinintuId: d.kunch.id,
                status: 'approved',
                adminApprovedBy: userMap['admin'] || 1,
                adminApprovedAt: d.randomDate,
                createdBy: userMap['staff'] || 1,
                wbNo: `WB-${runId}-${d.index}`,
                lorryNumber: `LR-${runId}-${d.index}`,
                grossWeight: 50.00,
                tareWeight: 10.00,
                netWeight: 40.00
            }));
            const dbArrivals = await Arrival.bulkCreate(arrivalsArr);

            // 7. Purchase Rates
            await PurchaseRate.bulkCreate(dbArrivals.map(a => ({
                arrivalId: a.id,
                baseRate: 2500.00,
                rateType: 'CDL',
                amountFormula: 'Base * Bags',
                averageRate: 2500.00,
                totalAmount: (a.bags * 0.75) * 2500.00,
                status: 'approved',
                adminApprovedBy: userMap['admin'] || 1,
                createdBy: userMap['manager'] || 1
            })));

            console.log(`✅ Finalized batch ${b + 1} (${workflowData.length} records) [${Date.now() - batchStart}ms]`);
        }

        console.log(`\n🎉 SUCCESSFULLY SEEDED 25,000 COMPLETE WORKFLOWS in ${(Date.now() - startTime) / 1000}s`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding Fatal Error:', err);
        process.exit(1);
    }
}

seed();
