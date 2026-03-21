/**
 * DIRECT DATABASE SEED SCRIPT - 2 LAKH RECORDS (FIXED)
 * Uses raw SQL for fast bulk inserts
 * Date Range: January 1, 2025 to December 25, 2025
 * 
 * Usage: node scripts/seedDatabase.js
 */

require('dotenv').config();
const { sequelize } = require('../config/database');

// Configuration
const TOTAL_ARRIVALS = 160000;
const RICE_PRODUCTION = 40000;
const BATCH_SIZE = 2000;
const START_DATE = new Date('2025-01-01');
const END_DATE = new Date('2025-12-25');

// Sample data
const VARIETIES = ['SUM25 RNR', 'BPT', 'SONA MASURI', 'IR64', 'HMT', 'PONNI'];
const BROKERS = ['NITISH', 'MANJU', 'RAVI', 'SURESH', 'KUMAR', 'VENKAT', 'PRAKASH'];
const LOCATIONS = ['MANVI', 'RAICHUR', 'SINDHANUR', 'GANGAVATI', 'BELLARY', 'KOPPAL'];
const LORRY_NUMBERS = ['KA33F4567', 'KA34M1234', 'AP21X9876', 'TN45B5432', 'KA32H8765'];
const PRODUCT_TYPES = ['Rice', 'Broken', 'Bran', 'Faram', 'RJ Rice 1', 'Zero Broken', 'Sizer Broken', 'Unpolished'];

const randomElement = arr => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomDate = () => {
    const time = START_DATE.getTime() + Math.random() * (END_DATE.getTime() - START_DATE.getTime());
    return new Date(time).toISOString().split('T')[0];
};
const escStr = s => s ? `'${s.replace(/'/g, "''")}'` : 'NULL';

async function seedDatabase() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  DIRECT DATABASE SEED - 2 LAKH RECORDS');
    console.log('═══════════════════════════════════════════════════════════════');

    const startTime = Date.now();

    try {
        await sequelize.authenticate();
        console.log('✅ Database connected\n');

        // Get required IDs
        const [admins] = await sequelize.query(`SELECT id FROM users WHERE username = 'ashish' LIMIT 1`);
        const adminId = admins[0]?.id || 3;

        const [kunchinittus] = await sequelize.query(`SELECT id, "warehouseId" FROM kunchinittus WHERE "isActive" = true LIMIT 30`);
        const [outturns] = await sequelize.query(`SELECT id FROM outturns LIMIT 50`);
        const [packagings] = await sequelize.query(`SELECT id, "allottedKg" FROM packagings LIMIT 5`);

        console.log(`📋 Admin ID: ${adminId}, Kunchinittus: ${kunchinittus.length}, Outturns: ${outturns.length}`);

        if (kunchinittus.length === 0) {
            console.error('❌ No kunchinittus found. Please create base data first.');
            process.exit(1);
        }

        // Get max slNo
        const [maxSlNo] = await sequelize.query(`SELECT COALESCE(MAX(CAST(SUBSTRING("slNo" FROM 2) AS INTEGER)), 0) as max FROM arrivals`);
        let slNoCounter = (maxSlNo[0]?.max || 0) + 1;

        let totalInserted = 0;

        // ========== INSERT ARRIVALS ==========
        console.log(`\n📊 Inserting ${TOTAL_ARRIVALS.toLocaleString()} Arrivals...`);

        const batches = Math.ceil(TOTAL_ARRIVALS / BATCH_SIZE);
        for (let batch = 0; batch < batches; batch++) {
            const batchCount = Math.min(BATCH_SIZE, TOTAL_ARRIVALS - (batch * BATCH_SIZE));
            const values = [];

            for (let i = 0; i < batchCount; i++) {
                const mvmtIndex = i % 4; // 0=purchase, 1=shifting, 2=prod-shift, 3=for-prod
                const mvmtTypes = ['purchase', 'shifting', 'production-shifting', 'for-production'];
                const mvmtType = mvmtTypes[mvmtIndex];

                const kn = kunchinittus[i % kunchinittus.length];
                const fromKn = kunchinittus[(i + 1) % kunchinittus.length];
                const toKn = kunchinittus[(i + 2) % kunchinittus.length];
                const outturn = outturns[i % outturns.length];

                const bags = randomBetween(50, 200);
                const grossWeight = bags * randomBetween(55, 65);
                const tareWeight = bags * 1.5;
                const netWeight = grossWeight - tareWeight;
                const slNo = `A${String(slNoCounter++).padStart(6, '0')}`;

                const isPurchase = mvmtType === 'purchase';
                const isShifting = mvmtType === 'shifting';
                const isProdShift = mvmtType === 'production-shifting';
                const isForProd = mvmtType === 'for-production';

                values.push(`(
          ${escStr(slNo)}, '${randomDate()}', '${mvmtType}',
          ${isPurchase ? escStr(randomElement(BROKERS)) : 'NULL'},
          ${escStr(randomElement(VARIETIES))}, ${bags},
          ${isPurchase ? escStr(randomElement(LOCATIONS)) : 'NULL'},
          ${isPurchase || isShifting ? kn.id : 'NULL'},
          ${isPurchase ? kn.warehouseId : 'NULL'},
          ${isShifting || isProdShift ? fromKn.id : 'NULL'},
          ${isShifting || isProdShift ? fromKn.warehouseId : 'NULL'},
          ${isShifting ? toKn.warehouseId : 'NULL'},
          ${isProdShift || isForProd ? outturn.id : 'NULL'},
          ${randomBetween(10, 18)}, ${escStr(`${randomBetween(1, 5)}x${randomBetween(1, 5)}`)},
          ${escStr(`WB${randomBetween(10000, 99999)}`)},
          ${grossWeight}, ${tareWeight}, ${netWeight},
          ${escStr(randomElement(LORRY_NUMBERS))},
          'approved', ${adminId}, ${adminId}, NOW(), ${adminId}, NOW(), NOW(), NOW()
        )`);
            }

            try {
                await sequelize.query(`
          INSERT INTO arrivals (
            "slNo", date, "movementType", broker, variety, bags, "fromLocation",
            "toKunchinintuId", "toWarehouseId", "fromKunchinintuId", "fromWarehouseId",
            "toWarehouseShiftId", "outturnId", moisture, cutting, "wbNo",
            "grossWeight", "tareWeight", "netWeight", "lorryNumber",
            status, "createdBy", "approvedBy", "approvedAt", "adminApprovedBy", "adminApprovedAt", "createdAt", "updatedAt"
          ) VALUES ${values.join(',\n')}
          ON CONFLICT ("slNo") DO NOTHING
        `);
                totalInserted += batchCount;
            } catch (err) {
                console.error(`  ❌ Batch ${batch + 1} error:`, err.message.substring(0, 80));
            }

            if ((batch + 1) % 10 === 0 || batch === batches - 1) {
                const progress = ((batch + 1) / batches * 100).toFixed(1);
                const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
                console.log(`  Arrivals: ${progress}% (${totalInserted.toLocaleString()} records, ${elapsed}s)`);
            }
        }

        // ========== INSERT RICE PRODUCTION ==========
        console.log(`\n📊 Inserting ${RICE_PRODUCTION.toLocaleString()} Rice Production...`);

        const riceBatches = Math.ceil(RICE_PRODUCTION / BATCH_SIZE);
        let riceInserted = 0;

        for (let batch = 0; batch < riceBatches; batch++) {
            const batchCount = Math.min(BATCH_SIZE, RICE_PRODUCTION - (batch * BATCH_SIZE));
            const values = [];

            for (let i = 0; i < batchCount; i++) {
                const outturn = outturns[i % outturns.length];
                const packaging = packagings[i % packagings.length];
                const bags = randomBetween(10, 100);
                const qtls = (bags * (packaging?.allottedKg || 26)) / 100;

                values.push(`(
          ${outturn.id}, '${randomDate()}', '${randomElement(PRODUCT_TYPES)}',
          ${qtls.toFixed(2)}, ${packaging?.id || 1}, ${bags}, ${Math.round(qtls * 3)},
          'kunchinittu', ${escStr(`A${randomBetween(1, 5)}`)},
          ${adminId}, 'approved', ${adminId}, NOW(), NOW(), NOW()
        )`);
            }

            try {
                await sequelize.query(`
          INSERT INTO rice_productions (
            "outturnId", date, "productType", "quantityQuintals", "packagingId",
            bags, "paddyBagsDeducted", "movementType", "locationCode",
            "createdBy", status, "approvedBy", "approvedAt", "createdAt", "updatedAt"
          ) VALUES ${values.join(',\n')}
        `);
                riceInserted += batchCount;
                totalInserted += batchCount;
            } catch (err) {
                console.error(`  ❌ Batch error:`, err.message.substring(0, 80));
            }

            if ((batch + 1) % 5 === 0 || batch === riceBatches - 1) {
                const progress = ((batch + 1) / riceBatches * 100).toFixed(1);
                console.log(`  Rice Production: ${progress}% (${riceInserted.toLocaleString()} records)`);
            }
        }

        // Final counts
        const [finalArrivalCount] = await sequelize.query(`SELECT COUNT(*) as count FROM arrivals`);
        const [finalRiceCount] = await sequelize.query(`SELECT COUNT(*) as count FROM rice_productions`);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  ✅ SEED COMPLETE');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  Total Arrivals: ${parseInt(finalArrivalCount[0].count).toLocaleString()}`);
        console.log(`  Total Rice Productions: ${parseInt(finalRiceCount[0].count).toLocaleString()}`);
        console.log(`  Records Inserted: ${totalInserted.toLocaleString()}`);
        console.log(`  Duration: ${duration}s | Rate: ${(totalInserted / parseFloat(duration)).toFixed(0)}/sec`);
        console.log('═══════════════════════════════════════════════════════════════');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error.message);
        process.exit(1);
    }
}

seedDatabase();
