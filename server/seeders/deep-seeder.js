/**
 * Deep Seeding Script for Mother India Rice Mill
 * Generates 500,000 realistic records with Indian names and varieties.
 * Simulates the full workflow from Sample Entry to Completion.
 */

const {
    sequelize,
    User,
    Warehouse,
    Kunchinittu,
    Variety,
    Broker,
    RiceVariety,
    SampleEntry,
    QualityParameters,
    LotAllotment,
    PhysicalInspection,
    InventoryData,
    FinancialCalculation,
    Outturn,
    Arrival,
    RiceProduction,
    ByProduct,
    Packaging
} = require('../models/index');
const { v4: uuidv4 } = require('uuid');

const INDIAN_SURNAMES = ['Gupta', 'Sharma', 'Kumar', 'Singh', 'Patel', 'Reddy', 'Iyer', 'Chatterjee', 'Deshmukh', 'Joshi', 'Mehta', 'Verma', 'Yadav', 'Rao', 'Nair'];
const INDIAN_FIRSTNAMES = ['Ashish', 'Sanjay', 'Rahul', 'Priya', 'Amit', 'Vikram', 'Anjali', 'Deepak', 'Sunita', 'Rajesh', 'Kiran', 'Manoj', 'Suresh', 'Anita', 'Ramesh'];
const RICE_VARIETIES = [
    'Sona Masuri', 'IR64 Raw', 'IR64 Steam', 'Swarna', 'BPT 5204', 'Jeerakasala', 'Basmati', 'HMT', 'MTU 1010', 'MTU 1001',
    'RNR 15048', 'Kolam', 'Wada Kolam', 'Dubraj', 'Jeera Rice', 'Govind Bhog', 'Tulsi Bhog', 'Kala Namak', 'Ambe Mohar', 'Chinni Sakara',
    'Usna Rice', 'Pota Rice', 'Silky Rice', 'Broken Rice', 'Rejection Rice', 'Black Rice', 'Red Rice', 'Brown Rice', 'Jasmine Rice', 'Ponni'
];
const LOCATIONS = ['Delhi', 'Mumbai', 'Kolkata', 'Chennai', 'Hyderabad', 'Bangalore', 'Pune', 'Ahmedabad', 'Surat', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal'];

async function deepSeed() {
    console.log('Starting Deep Seeding (Total System: ~500,000+ records)...');

    // 0. Truncate for clean seeding
    await sequelize.query('TRUNCATE TABLE arrivals, rice_productions, by_products, sample_entries, quality_parameters, lot_allotments, physical_inspections, inventory_data, financial_calculations, packagings CASCADE;');

    // 1. Create Brokers (100)
    const brokers = [];
    for (let i = 0; i < 100; i++) {
        const name = `${INDIAN_FIRSTNAMES[i % INDIAN_FIRSTNAMES.length]} ${INDIAN_SURNAMES[Math.floor(Math.random() * INDIAN_SURNAMES.length)]} ${i}`;
        brokers.push({ name, isActive: true });
    }
    await Broker.bulkCreate(brokers, { ignoreDuplicates: true });
    console.log('Created 100 Brokers.');

    // 2. Create Rice Varieties (60)
    const varieties = [];
    for (let i = 0; i < 60; i++) {
        const name = `${RICE_VARIETIES[i % RICE_VARIETIES.length]} ${Math.floor(i / RICE_VARIETIES.length) + 1}`;
        varieties.push({ name, code: `RV-${i}`, isActive: true });
    }
    await RiceVariety.bulkCreate(varieties, { ignoreDuplicates: true });
    const locVarieties = varieties.map(v => ({ name: v.name, code: v.code }));
    await Variety.bulkCreate(locVarieties, { ignoreDuplicates: true });
    console.log('Created 60 Varieties.');

    // 3. Create Packagings (5)
    const packagings = [
        { brandName: 'Mother India 50kg', code: 'MI-50', allottedKg: 50 },
        { brandName: 'Mother India 25kg', code: 'MI-25', allottedKg: 25 },
        { brandName: 'Standard 50kg', code: 'STD-50', allottedKg: 50 },
        { brandName: 'Loose 100kg', code: 'LSE-100', allottedKg: 100 },
        { brandName: 'Export 10kg', code: 'EXP-10', allottedKg: 10 }
    ];
    await Packaging.bulkCreate(packagings, { ignoreDuplicates: true });
    const allPackagings = await Packaging.findAll();
    console.log('Created 5 Packagings.');

    // 4. Create Warehouses (10) and Kunchinittus (100)
    const warehouses = [];
    for (let i = 0; i < 10; i++) {
        warehouses.push({ name: `Warehouse ${i + 1}`, code: `WH-${i + 1}`, isActive: true });
    }
    await Warehouse.bulkCreate(warehouses, { ignoreDuplicates: true });
    const createdWarehouses = await Warehouse.findAll();

    const kunchinittus = [];
    for (let i = 0; i < 100; i++) {
        const wh = createdWarehouses[i % createdWarehouses.length];
        kunchinittus.push({
            name: `Kunchinittu ${i + 1}`,
            code: `KN-${i + 1}`,
            warehouseId: wh.id,
            isActive: true
        });
    }
    await Kunchinittu.bulkCreate(kunchinittus, { ignoreDuplicates: true });
    console.log('Created 10 Warehouses and 100 Kunchinittus.');

    // 5. Create Outturns (150)
    const outturns = [];
    for (let i = 0; i < 150; i++) {
        outturns.push({
            code: `OT-${i + 1}`,
            allottedVariety: RICE_VARIETIES[i % RICE_VARIETIES.length],
            type: i % 2 === 0 ? 'Raw' : 'Steam',
            createdBy: 1
        });
    }
    await Outturn.bulkCreate(outturns, { ignoreDuplicates: true });
    console.log('Created 150 Outturns.');

    // 6. Seed System Records
    const totalRecords = 500000;
    const chunkSize = 5000;
    const numChunks = totalRecords / chunkSize;

    const allBrokers = await Broker.findAll({ attributes: ['name'] });
    const allVarieties = await RiceVariety.findAll({ attributes: ['name'] });
    const allKbs = await Kunchinittu.findAll({ attributes: ['id', 'warehouseId'] });
    const allOts = await Outturn.findAll({ attributes: ['id'] });

    for (let chunk = 0; chunk < numChunks; chunk++) {
        const sampleEntries = [];
        const qualityParams = [];
        const allotments = [];
        const inspections = [];
        const inventories = [];
        const financials = [];
        const arrivals = [];
        const productions = [];
        const byProducts = [];

        for (let i = 0; i < chunkSize; i++) {
            const entryId = uuidv4();
            const workflowStatus = getWeightedStatus();
            const variety = allVarieties[Math.floor(Math.random() * allVarieties.length)].name;
            const broker = allBrokers[Math.floor(Math.random() * allBrokers.length)].name;
            const date = new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days

            // Sample Entry
            sampleEntries.push({
                id: entryId,
                createdByUserId: 1,
                entryDate: date,
                brokerName: broker,
                variety: variety,
                partyName: `Party ${INDIAN_SURNAMES[Math.floor(Math.random() * INDIAN_SURNAMES.length)]}`,
                location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
                bags: Math.floor(Math.random() * 500) + 100,
                entryType: 'CREATE_NEW',
                workflowStatus: workflowStatus
            });

            if (workflowStatus !== 'STAFF_ENTRY') {
                qualityParams.push({
                    id: uuidv4(),
                    sampleEntryId: entryId,
                    reportedByUserId: 1,
                    moisture: (Math.random() * 5 + 10).toFixed(2),
                    cutting1: (Math.random() * 1).toFixed(2),
                    cutting2: (Math.random() * 1).toFixed(2),
                    bend: (Math.random() * 1).toFixed(2),
                    mixS: (Math.random() * 2).toFixed(2),
                    mixL: (Math.random() * 2).toFixed(2),
                    mix: (Math.random() * 5).toFixed(2),
                    kandu: (Math.random() * 1).toFixed(2),
                    oil: (Math.random() * 0.5).toFixed(2),
                    sk: (Math.random() * 1).toFixed(2),
                    grainsCount: 500,
                    wbR: (Math.random() * 10).toFixed(2),
                    wbBk: (Math.random() * 5).toFixed(2),
                    wbT: (Math.random() * 15).toFixed(2),
                    paddyWb: (Math.random() * 5).toFixed(2),
                    reportedBy: 'System Seeder'
                });

                if (['LOT_ALLOTMENT', 'PHYSICAL_INSPECTION', 'INVENTORY_ENTRY', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW', 'COMPLETED'].includes(workflowStatus)) {
                    const allotmentId = uuidv4();
                    allotments.push({
                        id: allotmentId,
                        sampleEntryId: entryId,
                        allottedByManagerId: 1,
                        allottedToSupervisorId: 1,
                        allottedBags: Math.floor(Math.random() * 500) + 100
                    });

                    if (['PHYSICAL_INSPECTION', 'INVENTORY_ENTRY', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW', 'COMPLETED'].includes(workflowStatus)) {
                        const inspectionId = uuidv4();
                        inspections.push({
                            id: inspectionId,
                            sampleEntryId: entryId,
                            lotAllotmentId: allotmentId,
                            reportedByUserId: 1,
                            inspectionDate: date,
                            bags: Math.floor(Math.random() * 500) + 100,
                            lorryNumber: `KA ${Math.floor(Math.random() * 99)} ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${String.fromCharCode(65 + Math.floor(Math.random() * 26))} ${Math.floor(Math.random() * 9999)}`,
                            cutting1: (Math.random() * 2).toFixed(2),
                            bend: (Math.random() * 1).toFixed(2),
                            isComplete: true
                        });

                        if (['INVENTORY_ENTRY', 'OWNER_FINANCIAL', 'MANAGER_FINANCIAL', 'FINAL_REVIEW', 'COMPLETED'].includes(workflowStatus)) {
                            const inventoryId = uuidv4();
                            const locType = Math.random() > 0.4 ? 'DIRECT_KUNCHINITTU' : 'DIRECT_OUTTURN_PRODUCTION';
                            const kb = allKbs[Math.floor(Math.random() * allKbs.length)];
                            const ot = allOts[Math.floor(Math.random() * allOts.length)];

                            inventories.push({
                                id: inventoryId,
                                physicalInspectionId: inspectionId,
                                recordedByUserId: 1,
                                entryDate: date,
                                variety: variety,
                                bags: Math.floor(Math.random() * 500) + 100,
                                moisture: (Math.random() * 5 + 10).toFixed(2),
                                wbNumber: `WB-${Math.floor(Math.random() * 100000)}`,
                                grossWeight: 50000,
                                tareWeight: 15000,
                                netWeight: 35000,
                                location: locType,
                                kunchinittuId: locType === 'DIRECT_KUNCHINITTU' ? kb.id : null,
                                outturnId: locType === 'DIRECT_OUTTURN_PRODUCTION' ? ot.id : null
                            });

                            // Create Arrival for record consistency
                            arrivals.push({
                                slNo: `A-${entryId.substring(0, 8)}`,
                                date: date,
                                movementType: locType === 'DIRECT_KUNCHINITTU' ? 'purchase' : 'for-production',
                                broker: broker,
                                variety: variety,
                                bags: Math.floor(Math.random() * 500) + 100,
                                toKunchinintuId: locType === 'DIRECT_KUNCHINITTU' ? kb.id : null,
                                toWarehouseId: locType === 'DIRECT_KUNCHINITTU' ? kb.warehouseId : null,
                                outturnId: locType === 'DIRECT_OUTTURN_PRODUCTION' ? ot.id : null,
                                wbNo: `WB-${Math.floor(Math.random() * 100000)}`,
                                grossWeight: 50000,
                                tareWeight: 15000,
                                netWeight: 35000,
                                lorryNumber: `KA ${Math.floor(Math.random() * 99)} AB ${Math.floor(Math.random() * 9999)}`,
                                status: 'approved',
                                createdBy: 1,
                                approvedBy: 1,
                                adminApprovedBy: 1,
                                adminApprovedAt: new Date()
                            });

                            if (workflowStatus === 'COMPLETED' && i % 5 === 0) { // Add some production
                                const prodQuintals = (Math.random() * 100 + 50).toFixed(2);
                                const prodBagsTotal = Math.round(prodQuintals * 2);
                                productions.push({
                                    outturnId: ot.id,
                                    date: new Date(date.getTime() + 86400000), // Next day
                                    productType: 'Rice',
                                    quantityQuintals: prodQuintals,
                                    packagingId: allPackagings[Math.floor(Math.random() * allPackagings.length)].id,
                                    bags: prodBagsTotal,
                                    paddyBagsDeducted: Math.round(prodQuintals * 3),
                                    movementType: 'kunchinittu',
                                    locationCode: `KN-${Math.floor(Math.random() * 100) + 1}`,
                                    createdBy: 1,
                                    status: 'approved',
                                    approvedBy: 1,
                                    approvedAt: new Date()
                                });

                                byProducts.push({
                                    outturnId: ot.id,
                                    date: new Date(date.getTime() + 86400000),
                                    rice: prodQuintals,
                                    bran: (Math.random() * 10).toFixed(2),
                                    broken: (Math.random() * 5).toFixed(2),
                                    createdBy: 1
                                });
                            }
                        }
                    }
                }
            }
        }

        await SampleEntry.bulkCreate(sampleEntries, { ignoreDuplicates: true });
        if (qualityParams.length > 0) await QualityParameters.bulkCreate(qualityParams, { ignoreDuplicates: true });
        if (allotments.length > 0) await LotAllotment.bulkCreate(allotments, { ignoreDuplicates: true });
        if (inspections.length > 0) await PhysicalInspection.bulkCreate(inspections, { ignoreDuplicates: true });
        if (inventories.length > 0) await InventoryData.bulkCreate(inventories, { ignoreDuplicates: true });
        if (arrivals.length > 0) await Arrival.bulkCreate(arrivals, { ignoreDuplicates: true });
        if (productions.length > 0) await RiceProduction.bulkCreate(productions, { ignoreDuplicates: true });
        if (byProducts.length > 0) await ByProduct.bulkCreate(byProducts, { ignoreDuplicates: true });

        process.stdout.write(`\rProgress: ${((chunk + 1) / numChunks * 100).toFixed(2)}% (${(chunk + 1) * chunkSize} records)`);
    }

    console.log('\nDeep Seeding Completed Successfully.');
    process.exit(0);
}

function getWeightedStatus() {
    const r = Math.random();
    if (r < 0.05) return 'STAFF_ENTRY';
    if (r < 0.1) return 'QUALITY_CHECK';
    if (r < 0.15) return 'LOT_SELECTION';
    if (r < 0.2) return 'LOT_ALLOTMENT';
    if (r < 0.4) return 'PHYSICAL_INSPECTION';
    if (r < 0.6) return 'OWNER_FINANCIAL';
    return 'COMPLETED';
}

deepSeed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
