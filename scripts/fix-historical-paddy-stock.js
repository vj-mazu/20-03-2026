const { RiceProduction } = require('../server/models');
const { sequelize } = require('../server/config/database');

async function migrate() {
    console.log('🚀 Starting paddy deduction migration...');

    const records = await RiceProduction.findAll({
        where: {
            paddyBagsDeducted: 0
        }
    });

    console.log(`📊 Found ${records.length} records to update.`);

    let updatedCount = 0;
    for (const record of records) {
        const noDeductionProducts = ['Bran', 'Farm Bran', 'Faram'];

        if (noDeductionProducts.includes(record.productType)) {
            continue;
        }

        // Formula: quintals / 0.47 (rounded)
        const paddyDeduction = Math.round(record.quantityQuintals / 0.47);

        await record.update({ paddyBagsDeducted: paddyDeduction });
        updatedCount++;

        if (updatedCount % 10 === 0) {
            console.log(`✅ Updated ${updatedCount}/${records.length} records...`);
        }
    }

    console.log(`✨ Migration finished! Total records updated: ${updatedCount}`);
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
