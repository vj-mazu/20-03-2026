const { sequelize } = require('../config/database');

async function up() {
  console.log('🔄 Fixing Rice Hamali rates with exact data from images...');

  try {
    // Clear existing rates to ensure exact match with images
    // Since we are resetting the database, this is safe and necessary
    await sequelize.query('DELETE FROM rice_hamali_rates');
    console.log('🗑️ Existing rice hamali rates cleared.');

    // Insert exact rice hamali rates data from the three images
    // ONLY rate_24_27 (Above 24 feet) is needed - other two rates removed
    const ratesData = [
      // Image 2 - Nitt/Shifting (S.No 7)
      ['Nitt/Shifting', '50 Kg', 0, 0, 1.54, 7],
      ['Nitt/Shifting', 'Above 10 Kg (+.36)', 0, 0, 2.16, 7],
      ['Nitt/Shifting', '30 Kg', 0, 0, 1.46, 7],
      ['Nitt/Shifting', 'Above 10 Kg (+0.36)', 0, 0, 2.16, 7],
      ['Nitt/Shifting', '25/26 Kg', 0, 0, 1.23, 7],
      ['Nitt/Shifting', 'Above 12 (+0.30)', 0, 0, 1.74, 7],
      ['Nitt/Shifting', '10 Kg', 0, 0, 0.60, 7],
      ['Nitt/Shifting', 'above 15 (+0.25)', 0, 0, 0.89, 7],
      ['Nitt/Shifting', 'Above 100 Kg', 0, 0, 3.08, 7],
      ['Nitt/Shifting', 'Above 8 (+0.60)', 0, 0, 4.11, 7],
      ['Nitt/Shifting', 'Polish 50/55 Kg', 0, 0, 1.54, 7],
      ['Nitt/Shifting', 'Above 8 (+0.25)', 0, 0, 2.06, 7],

      // Image 2 - Loading (S.No 8)
      ['Loading', '50 Kg', 0, 0, 2.26, 8],
      ['Loading', '30 Kg', 0, 0, 1.96, 8],
      ['Loading', '25/26 Kg', 0, 0, 1.64, 8],
      ['Loading', '10 Kg', 0, 0, 0.83, 8],
      ['Loading', 'Above 50 Kg', 0, 0, 3.08, 8],
      ['Loading', 'Polish 50/55 Kg', 0, 0, 2.47, 8],

      // Image 2 - Machine Loading (S.No 9)
      ['Machine Loading', '50 Kg', 0, 0, 1.23, 9],
      ['Machine Loading', '30 Kg', 0, 0, 1.02, 9],
      ['Machine Loading', '25/26 Kg', 0, 0, 0.86, 9],
      ['Machine Loading', '10 Kg', 0, 0, 0.42, 9],

      // Image 2 - Chaki (S.No 10)
      ['Chaki', '50 Kg', 0, 0, 1.54, 10],
      ['Chaki', '25 Kg', 0, 0, 1.54, 10],
      ['Chaki', '30 Kg', 0, 0, 1.61, 10],

      // Image 2 - Rashi (S.No 11)
      ['Rashi', '50 Kg', 0, 0, 1.86, 11],
      ['Rashi', 'Above 50 Kg', 0, 0, 2.30, 11],

      // Image 1 - Palti (S.No 12)
      ['Palti', '50 Kg to 50 Kg', 0, 0, 1.86, 12],
      ['Palti', '25 Kg to 25 Kg', 0, 0, 1.54, 12],
      ['Palti', '30 Kg to 30 Kg', 0, 0, 1.61, 12],
      ['Palti', '25 Kg to 50 Kg', 0, 0, 3.08, 12],
      ['Palti', '50 Kg to 25 Kg', 0, 0, 3.08, 12],

      // Image 1 - Stiching (S.No 13)
      ['Stiching', '50 Kg', 0, 0, 0.61, 13],
      ['Stiching', '30 Kg', 0, 0, 0.54, 13],
      ['Stiching', '25 Kg', 0, 0, 0.46, 13],
      ['Stiching', '10 Kg or 5 Kg', 0, 0, 0.46, 13],

      // Image 1 - Bag filling 50 Kg without Kata (S.No 14)
      ['Bag filling 50 Kg without Kata', 'Rashi', 0, 0, 2.00, 14],
      ['Bag filling 50 Kg without Kata', 'Bunker', 0, 0, 1.54, 14],

      // Image 1 - Bag filling 30 Kg without Kata (S.No 15)
      ['Bag filling 30 Kg without Kata', 'Rashi', 0, 0, 1.86, 15],
      ['Bag filling 30 Kg without Kata', 'Bunker', 0, 0, 1.37, 15],

      // Image 1 - Bag filling 25 Kg without Kata (S.No 15)
      ['Bag filling 25 Kg without Kata', 'Rashi', 0, 0, 1.86, 15],
      ['Bag filling 25 Kg without Kata', 'Bunker', 0, 0, 1.37, 15],

      // Image 1 - Bag filling 100 Kg without Kata (S.No 16)
      ['Bag filling 100 Kg without Kata', 'Rashi', 0, 0, 3.08, 16],
      ['Bag filling 100 Kg without Kata', 'Bunker', 0, 0, 2.47, 16],

      // Image 1 - Only Kata/Re Kata (S.No 17)
      ['Only Kata/Re Kata', '100 Kg/50 Kg', 0, 0, 1.53, 17],
      ['Only Kata/Re Kata', '25 Kg', 0, 0, 1.07, 17],

      // Image 3 - Kata 75 kg Packing with stiching (S.No 1)
      ['Kata 75 kg Packing with stiching', 'Rashi', 0, 0, 4.63, 1],
      ['Kata 75 kg Packing with stiching', 'Bunker', 0, 0, 4.07, 1],
      ['Kata 75 kg Packing with stiching', 'Machine Packing with Stiching', 0, 0, 1.07, 1],
      ['Kata 75 kg Packing with stiching', 'Machine packing without conveyor', 0, 0, 1.74, 1],

      // Image 3 - Kata 50 kg Packing with stiching (S.No 2)
      ['Kata 50 kg Packing with stiching', 'Rashi', 0, 0, 3.40, 2],
      ['Kata 50 kg Packing with stiching', 'Bunker', 0, 0, 2.91, 2],
      ['Kata 50 kg Packing with stiching', 'Machine Packing with stiching', 0, 0, 0.86, 2],
      ['Kata 50 kg Packing with stiching', 'Machine packing without conveyor', 0, 0, 1.54, 2],

      // Image 3 - Kata 30 Kg (S.No 3)
      ['Kata 30 Kg', 'Rashi', 0, 0, 2.96, 3],
      ['Kata 30 Kg', 'Bunker', 0, 0, 2.75, 3],
      ['Kata 30 Kg', 'Machine Packing with stiching', 0, 0, 0.86, 3],
      ['Kata 30 Kg', 'Machine packing without conveyor', 0, 0, 1.46, 3],

      // Image 3 - Kata 25/26 Kg (S.No 3)
      ['Kata 25/26 Kg', 'Rashi', 0, 0, 2.47, 3],
      ['Kata 25/26 Kg', 'Bunker', 0, 0, 2.30, 3],
      ['Kata 25/26 Kg', 'Machine Packing with stiching', 0, 0, 0.86, 3],
      ['Kata 25/26 Kg', 'Machine packing without conveyor', 0, 0, 1.23, 3],

      // Image 3 - Kata 10 Kg with 50 Kg bag packing (S.No 4)
      ['Kata 10 Kg with 50 Kg bag packing', 'Rashi', 0, 0, 1.86, 4],
      ['Kata 10 Kg with 50 Kg bag packing', 'Bunker', 0, 0, 1.69, 4],
      ['Kata 10 Kg with 50 Kg bag packing', 'Machine Packing with stiching', 0, 0, 0.76, 4],
      ['Kata 10 Kg with 50 Kg bag packing', 'Machine packing without conveyor', 0, 0, 0.93, 4],

      // Image 3 - Polish Kata 50/55 Kg with stich (S.No 5)
      ['Polish Kata 50/55 Kg with stich', 'Rashi', 0, 0, 3.84, 5],

      // Image 3 - Frem kata with Nitt from rashi (S.No 6)
      ['Frem kata with Nitt from rashi', '50 Kg', 0, 0, 4.46, 6],
      ['Frem kata with Nitt from rashi', 'Above 50 Kg', 0, 0, 5.23, 6]
    ];

    for (const [work_type, work_detail, rate_18_21, rate_21_24, rate_24_27, display_order] of ratesData) {
      await sequelize.query(`
        INSERT INTO rice_hamali_rates (work_type, work_detail, rate_18_21, rate_21_24, rate_24_27, display_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, {
        replacements: [work_type, work_detail, rate_18_21, rate_21_24, rate_24_27, display_order]
      });
    }

    console.log('✅ Rice hamali rates data from images inserted');

    // Verify final count
    const [finalCount] = await sequelize.query('SELECT COUNT(*) as count FROM rice_hamali_rates');
    console.log(`📊 Final rice hamali rates count: ${finalCount[0].count}`);

    console.log('✅ Rice Hamali rates from images migration completed successfully');

  } catch (error) {
    console.error('❌ Error in Rice Hamali rates from images migration:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Removing Rice Hamali rates from images...');

  try {
    await sequelize.query('DELETE FROM rice_hamali_rates');
    console.log('✅ Rice Hamali rates from images removed');
  } catch (error) {
    console.error('❌ Error removing Rice Hamali rates from images:', error);
    throw error;
  }
}

module.exports = { up, down };