/**
 * COMPREHENSIVE LOAD TEST SCRIPT
 * Generates 2 Lakh (200,000) connected test records across all modules
 * Date Range: January 1, 2025 to December 25, 2025
 * 
 * Usage: node scripts/loadTest.js
 * Admin: username=ashish, password=ashish789
 */

const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000/api';
const ADMIN_CREDENTIALS = { username: 'ashish', password: 'ashish789' };
const TOTAL_RECORDS = 200000;
const START_DATE = new Date('2025-01-01');
const END_DATE = new Date('2025-12-25');

// Distribution of records (total = 100%)
const DISTRIBUTION = {
    arrivals_purchase: 30,
    arrivals_shifting: 15,
    arrivals_production_shifting: 10,
    rice_production: 25,
    rice_purchase: 5,
    rice_sale: 10,
    rice_palti: 5
};

// Sample data
const VARIETIES = ['SUM25 RNR', 'BPT', 'SONA MASURI', 'IR64', 'HMT', 'PONNI'];
const BROKERS = ['NITISH', 'MANJU', 'RAVI', 'SURESH', 'KUMAR', 'VENKAT', 'PRAKASH'];
const LOCATIONS = ['MANVI', 'RAICHUR', 'SINDHANUR', 'GANGAVATI', 'BELLARY', 'KOPPAL'];
const LORRY_NUMBERS = ['KA33F4567', 'KA34M1234', 'AP21X9876', 'TN45B5432', 'KA32H8765'];
const PRODUCT_TYPES = ['Rice', 'Broken', 'Bran', 'Faram', 'RJ Rice 1', 'Zero Broken', 'Sizer Broken', 'Unpolished'];
const PACKAGING_BRANDS = ['bullet', 'premium', 'A1', 'gold', 'silver'];

let authToken = null;
let adminUserId = null;
let createdData = {
    warehouses: [],
    kunchinittus: [],
    varieties: [],
    outturns: [],
    packagings: [],
    arrivals: []
};

// Utility functions
function randomElement(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate() {
    const time = START_DATE.getTime() + Math.random() * (END_DATE.getTime() - START_DATE.getTime());
    return new Date(time).toISOString().split('T')[0];
}

function generateWBNo() {
    return `WB${randomBetween(10000, 99999)}`;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// API helper
async function api(method, endpoint, data = null, silent = false) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            timeout: 30000
        };
        if (data) config.data = data;
        const response = await axios(config);
        return response.data;
    } catch (error) {
        if (!silent && error.response) {
            console.error(`  ❌ API Error: ${method} ${endpoint}`, error.response.data?.error || error.response.data);
        }
        return null;
    }
}

// Login
async function login() {
    console.log('🔐 Logging in as admin...');
    try {
        const response = await api('POST', '/auth/login', ADMIN_CREDENTIALS);
        if (response && response.token) {
            authToken = response.token;
            adminUserId = response.user.id;
            console.log(`✅ Logged in as ${response.user.username} (ID: ${adminUserId})`);
            return true;
        }
    } catch (e) {
        console.error('❌ Login failed:', e.message);
    }
    return false;
}

// Create base data
async function createBaseData() {
    console.log('\n📦 Creating base data...');

    // 1. Create Varieties
    console.log('\n  📋 Creating varieties...');
    for (const [i, name] of VARIETIES.entries()) {
        const result = await api('POST', '/locations/varieties', {
            name: name,
            code: `V${i + 1}`,
            isActive: true
        }, true);
        if (result && result.variety) {
            console.log(`    ✅ Created variety: ${name}`);
        }
    }

    // Fetch existing varieties
    const varietiesResp = await api('GET', '/locations/varieties', null, true);
    createdData.varieties = varietiesResp?.varieties || [];
    console.log(`    📊 Total varieties: ${createdData.varieties.length}`);

    // 2. Create Warehouses
    console.log('\n  🏭 Creating warehouses...');
    for (let i = 1; i <= 5; i++) {
        const result = await api('POST', '/locations/warehouses', {
            name: `WAREHOUSE${i}`,
            code: `WH${i}`,
            location: `Location ${i}`,
            isActive: true
        }, true);
        if (result && result.warehouse) {
            console.log(`    ✅ Created warehouse: WAREHOUSE${i}`);
        }
    }

    // Fetch existing warehouses
    const warehousesResp = await api('GET', '/locations/warehouses', null, true);
    createdData.warehouses = warehousesResp?.warehouses || [];
    console.log(`    📊 Total warehouses: ${createdData.warehouses.length}`);

    // 3. Create Kunchinittus (linked to warehouses and varieties)
    console.log('\n  📦 Creating kunchinittus...');
    let knCreated = 0;
    for (let i = 1; i <= 20; i++) {
        const warehouseIdx = (i - 1) % createdData.warehouses.length;
        const varietyIdx = (i - 1) % Math.max(createdData.varieties.length, 1);
        const warehouse = createdData.warehouses[warehouseIdx];
        const variety = createdData.varieties[varietyIdx];

        if (warehouse) {
            const result = await api('POST', '/locations/kunchinittus', {
                name: `KUNCHINITTU_${i}_${warehouse.code || 'WH'}`,
                code: `KN${i}`,
                warehouseId: warehouse.id,
                varietyId: variety?.id || null,
                isActive: true
            }, true);
            if (result && result.kunchinittu) {
                knCreated++;
                console.log(`    ✅ Created: KN${i} in ${warehouse.code}`);
            }
        }
    }

    // Fetch existing kunchinittus
    const kunchResp = await api('GET', '/locations/kunchinittus', null, true);
    createdData.kunchinittus = kunchResp?.kunchinittus || [];
    console.log(`    📊 Total kunchinittus: ${createdData.kunchinittus.length}`);

    // 4. Create Packagings
    console.log('\n  📦 Creating packagings...');
    const kgOptions = [25, 26, 30, 50];
    for (const [i, brand] of PACKAGING_BRANDS.entries()) {
        const result = await api('POST', '/packagings', {
            brandName: brand,
            code: brand.toUpperCase(),
            allottedKg: kgOptions[i % kgOptions.length]
        }, true);
        if (result) {
            console.log(`    ✅ Created packaging: ${brand}`);
        }
    }

    // Fetch existing packagings
    const packResp = await api('GET', '/packagings', null, true);
    createdData.packagings = packResp?.packagings || packResp || [];
    if (Array.isArray(packResp)) createdData.packagings = packResp;
    console.log(`    📊 Total packagings: ${createdData.packagings.length}`);

    // 5. Create Outturns
    console.log('\n  📦 Creating outturns...');
    for (let i = 1; i <= 30; i++) {
        const variety = randomElement(VARIETIES);
        const result = await api('POST', '/outturns', {
            code: `out${String(i).padStart(2, '0')}`,
            allottedVariety: variety,
            type: i % 2 === 0 ? 'Raw' : 'Steam'
        }, true);
        if (result) {
            console.log(`    ✅ Created outturn: out${String(i).padStart(2, '0')} (${variety})`);
        }
    }

    // Fetch existing outturns
    const outResp = await api('GET', '/outturns', null, true);
    createdData.outturns = outResp?.outturns || outResp || [];
    if (Array.isArray(outResp)) createdData.outturns = outResp;
    console.log(`    📊 Total outturns: ${createdData.outturns.length}`);

    console.log('\n✅ Base data setup complete!');
    console.log(`  - Varieties: ${createdData.varieties.length}`);
    console.log(`  - Warehouses: ${createdData.warehouses.length}`);
    console.log(`  - Kunchinittus: ${createdData.kunchinittus.length}`);
    console.log(`  - Packagings: ${createdData.packagings.length}`);
    console.log(`  - Outturns: ${createdData.outturns.length}`);

    // Check minimum requirements
    if (createdData.warehouses.length === 0) {
        throw new Error('No warehouses available');
    }
    if (createdData.kunchinittus.length === 0) {
        throw new Error('No kunchinittus available');
    }
}

// Generate arrival record
function generateArrivalRecord(type) {
    const kn = randomElement(createdData.kunchinittus);
    const variety = kn?.variety?.name || randomElement(VARIETIES);
    const bags = randomBetween(50, 200);
    const grossWeight = bags * randomBetween(55, 65);
    const tareWeight = bags * 1.5;

    const base = {
        date: randomDate(),
        movementType: type,
        variety: variety,
        bags: bags,
        moisture: randomBetween(10, 18),
        cutting: `${randomBetween(1, 5)}x${randomBetween(1, 5)}`,
        wbNo: generateWBNo(),
        grossWeight: grossWeight,
        tareWeight: tareWeight,
        lorryNumber: randomElement(LORRY_NUMBERS)
    };

    if (type === 'purchase') {
        return {
            ...base,
            broker: randomElement(BROKERS),
            fromLocation: randomElement(LOCATIONS),
            toKunchinintuId: kn?.id,
            toWarehouseId: kn?.warehouseId || kn?.warehouse?.id
        };
    } else if (type === 'shifting') {
        const fromKn = randomElement(createdData.kunchinittus);
        const toKn = randomElement(createdData.kunchinittus.filter(k => k.id !== fromKn?.id)) || fromKn;
        return {
            ...base,
            variety: fromKn?.variety?.name || variety,
            fromKunchinintuId: fromKn?.id,
            fromWarehouseId: fromKn?.warehouseId || fromKn?.warehouse?.id,
            toKunchinintuId: toKn?.id,
            toWarehouseShiftId: toKn?.warehouseId || toKn?.warehouse?.id
        };
    } else if (type === 'production-shifting') {
        const fromKn = randomElement(createdData.kunchinittus);
        const outturn = randomElement(createdData.outturns);
        return {
            ...base,
            fromKunchinintuId: fromKn?.id,
            fromWarehouseId: fromKn?.warehouseId || fromKn?.warehouse?.id,
            outturnId: outturn?.id,
            variety: outturn?.allottedVariety || variety
        };
    }
    return base;
}

// Generate rice production record
function generateRiceProductionRecord() {
    const outturn = randomElement(createdData.outturns);
    const packaging = randomElement(createdData.packagings);
    const bags = randomBetween(10, 100);
    const qtls = (bags * (packaging?.allottedKg || 26)) / 100;

    return {
        outturnId: outturn?.id,
        date: randomDate(),
        productType: randomElement(PRODUCT_TYPES),
        quantityQuintals: parseFloat(qtls.toFixed(2)),
        packagingId: packaging?.id,
        bags: bags,
        movementType: 'kunchinittu',
        locationCode: `A${randomBetween(1, 5)}`
    };
}

// Batch insert function
async function batchInsert(type, count, generateFn, endpoint) {
    console.log(`\n📊 Inserting ${count.toLocaleString()} ${type} records...`);

    let inserted = 0;
    let failed = 0;
    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
        try {
            const record = generateFn();
            const result = await api('POST', endpoint, record, true);
            if (result) {
                inserted++;
                if (type.includes('Arrivals') && result.arrival) {
                    createdData.arrivals.push(result.arrival);
                }
            } else {
                failed++;
            }
        } catch (e) {
            failed++;
        }

        // Progress update every 1000 records
        if ((i + 1) % 1000 === 0) {
            const progress = ((i + 1) / count * 100).toFixed(1);
            const elapsed = Math.max((Date.now() - startTime) / 1000, 1);
            const rate = (inserted / elapsed).toFixed(0);
            console.log(`  Progress: ${progress}% | Inserted: ${inserted} | Failed: ${failed} | Rate: ${rate}/sec`);
        }

        // Small delay every 50 records
        if (i % 50 === 0) {
            await sleep(10);
        }
    }

    console.log(`✅ ${type}: ${inserted.toLocaleString()} inserted, ${failed.toLocaleString()} failed`);
    return inserted;
}

// Main execution
async function runLoadTest() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  COMPREHENSIVE LOAD TEST - 2 LAKH RECORDS');
    console.log('  Date Range: January 1, 2025 - December 25, 2025');
    console.log('═══════════════════════════════════════════════════════════════');

    const startTime = Date.now();

    try {
        // Step 1: Login
        const loggedIn = await login();
        if (!loggedIn) {
            console.error('❌ Cannot proceed without login.');
            process.exit(1);
        }

        // Step 2: Create base data
        await createBaseData();

        // Step 3: Calculate record counts
        const counts = {};
        for (const [key, percent] of Object.entries(DISTRIBUTION)) {
            counts[key] = Math.floor(TOTAL_RECORDS * percent / 100);
        }

        console.log('\n📋 Record Distribution:');
        for (const [key, count] of Object.entries(counts)) {
            console.log(`  ${key}: ${count.toLocaleString()}`);
        }

        // Step 4: Insert records
        let totalInserted = 0;

        // Arrivals - Purchase (must come first to have stock)
        totalInserted += await batchInsert(
            'Arrivals (Purchase)',
            counts.arrivals_purchase,
            () => generateArrivalRecord('purchase'),
            '/arrivals'
        );

        // Arrivals - Shifting
        totalInserted += await batchInsert(
            'Arrivals (Shifting)',
            counts.arrivals_shifting,
            () => generateArrivalRecord('shifting'),
            '/arrivals'
        );

        // Arrivals - Production Shifting
        totalInserted += await batchInsert(
            'Arrivals (Production-Shifting)',
            counts.arrivals_production_shifting,
            () => generateArrivalRecord('production-shifting'),
            '/arrivals'
        );

        // Rice Production
        totalInserted += await batchInsert(
            'Rice Production',
            counts.rice_production,
            generateRiceProductionRecord,
            '/rice-production'
        );

        // Rice Purchase
        totalInserted += await batchInsert(
            'Rice Purchase',
            counts.rice_purchase,
            () => {
                const packaging = randomElement(createdData.packagings);
                return {
                    date: randomDate(),
                    productType: randomElement(['Rice', 'Broken', 'Bran']),
                    variety: randomElement(VARIETIES),
                    packagingId: packaging?.id,
                    bags: randomBetween(10, 100),
                    bagSizeKg: packaging?.allottedKg || 26,
                    locationCode: `A${randomBetween(1, 5)}`,
                    buyerName: randomElement(BROKERS),
                    billNumber: `BP${randomBetween(10000, 99999)}`
                };
            },
            '/rice-stock-management/purchase'
        );

        // Rice Sale
        totalInserted += await batchInsert(
            'Rice Sale',
            counts.rice_sale,
            () => {
                const packaging = randomElement(createdData.packagings);
                return {
                    date: randomDate(),
                    productType: randomElement(['Rice', 'Broken', 'Bran']),
                    variety: randomElement(VARIETIES),
                    packagingId: packaging?.id,
                    bags: randomBetween(10, 50),
                    bagSizeKg: packaging?.allottedKg || 26,
                    locationCode: `A${randomBetween(1, 5)}`,
                    buyerName: randomElement(['BUYER1', 'BUYER2', 'WHOLESALER1']),
                    lorryNumber: randomElement(LORRY_NUMBERS),
                    billNumber: `BS${randomBetween(10000, 99999)}`
                };
            },
            '/rice-stock-management/sale'
        );

        // Rice Palti
        totalInserted += await batchInsert(
            'Rice Palti',
            counts.rice_palti,
            () => {
                const sourcePackaging = randomElement(createdData.packagings);
                const targetPackaging = randomElement(createdData.packagings.filter(p => p?.id !== sourcePackaging?.id)) || sourcePackaging;
                return {
                    date: randomDate(),
                    productType: randomElement(['Rice', 'Broken', 'Bran']),
                    variety: randomElement(VARIETIES),
                    sourcePackagingId: sourcePackaging?.id,
                    targetPackagingId: targetPackaging?.id,
                    bags: randomBetween(10, 50),
                    shortageKg: randomBetween(0, 5),
                    locationCode: `A${randomBetween(1, 5)}`
                };
            },
            '/rice-stock-management/palti'
        );

        // Summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  LOAD TEST COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  Total Records Inserted: ${totalInserted.toLocaleString()}`);
        console.log(`  Duration: ${duration} seconds`);
        console.log(`  Rate: ${(totalInserted / parseFloat(duration)).toFixed(0)} records/second`);
        console.log('═══════════════════════════════════════════════════════════════');

    } catch (error) {
        console.error('\n❌ Load test failed:', error.message);
        process.exit(1);
    }
}

// Run
runLoadTest();
