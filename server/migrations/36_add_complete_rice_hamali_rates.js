const { sequelize } = require('../config/database');

async function up() {
  console.log('🔄 Adding complete Rice Hamali rates (69 work types)...');
  
  try {
    // Check current count
    const [currentCount] = await sequelize.query('SELECT COUNT(*) as count FROM rice_hamali_rates');
    console.log(`📊 Current rice hamali rates count: ${currentCount[0].count}`);

    // If we have less than 69 entries, add the missing ones
    if (currentCount[0].count < 69) {
      // Clear existing data to avoid duplicates
      await sequelize.query('DELETE FROM rice_hamali_rates');
      console.log('🗑️ Cleared existing rice hamali rates');

      // Insert complete rice hamali rates data - All 69 work types from user's images
      const ratesData = [
        // Nitt/Shifting
        ['Nitt/Shifting', '50 Kg', 1.08, 1.30, 1.54, 1],
        ['Nitt/Shifting', 'Above 10 Kg (+.36)', 1.51, 1.81, 2.16, 2],
        ['Nitt/Shifting', '30 Kg', 0.00, 1.23, 1.46, 3],
        ['Nitt/Shifting', 'Above 10 Kg (+0.36)', 1.51, 1.81, 2.16, 4],
        ['Nitt/Shifting', '25/26 Kg', 0.86, 1.03, 1.23, 5],
        ['Nitt/Shifting', 'Above 12 (+0.30)', 1.22, 1.46, 1.74, 6],
        ['Nitt/Shifting', '10 Kg', 0.00, 0.50, 0.60, 7],
        ['Nitt/Shifting', 'above 15 (+0.25)', 0.00, 0.75, 0.89, 8],
        ['Nitt/Shifting', 'Above 100 Kg', 2.16, 2.59, 3.08, 9],
        ['Nitt/Shifting', 'Above 8 (+0.60)', 2.88, 3.46, 4.11, 10],
        ['Nitt/Shifting', 'Polish 50/55 Kg', 1.08, 1.30, 1.54, 11],
        ['Nitt/Shifting', 'Above 8 (+0.25)', 1.44, 1.73, 2.06, 12],

        // Loading
        ['Loading', '50 Kg', 1.58, 1.90, 2.26, 13],
        ['Loading', '30 Kg', 0.00, 1.65, 1.96, 14],
        ['Loading', '25/26 Kg', 1.15, 1.38, 1.64, 15],
        ['Loading', '10 Kg', 0.00, 0.70, 0.83, 16],
        ['Loading', 'Above 50 Kg', 2.16, 2.59, 3.08, 17],
        ['Loading', 'Polish 50/55 Kg', 1.73, 2.08, 2.47, 18],

        // Machine Loading
        ['Machine Loading', '50 Kg', 0.86, 1.03, 1.23, 19],
        ['Machine Loading', '30 Kg', 0.00, 0.86, 1.02, 20],
        ['Machine Loading', '25/26 Kg', 0.60, 0.72, 0.86, 21],
        ['Machine Loading', '10 Kg', 0.00, 0.35, 0.42, 22],

        // Chaki
        ['Chaki', '50 Kg', 1.08, 1.30, 1.54, 23],
        ['Chaki', '25 Kg', 1.08, 1.30, 1.54, 24],
        ['Chaki', '30 Kg', 0.00, 1.35, 1.61, 25],

        // Rashi
        ['Rashi', '50 Kg', 1.30, 1.56, 1.86, 26],
        ['Rashi', 'Above 50 Kg', 1.61, 1.93, 2.30, 27],

        // Palti
        ['Palti', '50 Kg', 0.72, 0.86, 1.03, 28],
        ['Palti', '30 Kg', 0.00, 0.72, 0.86, 29],
        ['Palti', '25/26 Kg', 0.50, 0.60, 0.72, 30],
        ['Palti', '10 Kg', 0.00, 0.30, 0.36, 31],
        ['Palti', 'Above 50 Kg', 1.08, 1.30, 1.54, 32],

        // Stiching
        ['Stiching', '50 Kg', 0.36, 0.43, 0.51, 33],
        ['Stiching', '30 Kg', 0.00, 0.36, 0.43, 34],
        ['Stiching', '25/26 Kg', 0.25, 0.30, 0.36, 35],
        ['Stiching', '10 Kg', 0.00, 0.15, 0.18, 36],
        ['Stiching', 'Above 50 Kg', 0.54, 0.65, 0.77, 37],

        // Bag filling 50 Kg without Kata
        ['Bag filling 50 Kg without Kata', '50 Kg', 0.72, 0.86, 1.03, 38],
        ['Bag filling 50 Kg without Kata', 'Above 10 (+0.18)', 0.90, 1.08, 1.29, 39],

        // Bag filling 30 Kg without Kata
        ['Bag filling 30 Kg without Kata', '30 Kg', 0.00, 0.72, 0.86, 40],
        ['Bag filling 30 Kg without Kata', 'Above 10 (+0.18)', 0.00, 0.90, 1.08, 41],

        // Bag filling 25 Kg without Kata
        ['Bag filling 25 Kg without Kata', '25/26 Kg', 0.50, 0.60, 0.72, 42],
        ['Bag filling 25 Kg without Kata', 'Above 12 (+0.15)', 0.65, 0.78, 0.93, 43],

        // Bag filling 100 Kg without Kata
        ['Bag filling 100 Kg without Kata', '100 Kg', 1.44, 1.73, 2.06, 44],
        ['Bag filling 100 Kg without Kata', 'Above 8 (+0.36)', 1.80, 2.16, 2.57, 45],

        // Only Kata/Re Kata
        ['Only Kata/Re Kata', '50 Kg', 0.36, 0.43, 0.51, 46],
        ['Only Kata/Re Kata', '30 Kg', 0.00, 0.36, 0.43, 47],
        ['Only Kata/Re Kata', '25/26 Kg', 0.25, 0.30, 0.36, 48],
        ['Only Kata/Re Kata', '10 Kg', 0.00, 0.15, 0.18, 49],
        ['Only Kata/Re Kata', '100 Kg', 0.72, 0.86, 1.03, 50],

        // Kata 75 kg Packing with stiching
        ['Kata 75 kg Packing with stiching', '75 Kg', 1.08, 1.30, 1.54, 51],
        ['Kata 75 kg Packing with stiching', 'Above 8 (+0.27)', 1.35, 1.62, 1.93, 52],

        // Kata 50 kg Packing with stiching
        ['Kata 50 kg Packing with stiching', '50 Kg', 1.08, 1.30, 1.54, 53],
        ['Kata 50 kg Packing with stiching', 'Above 10 (+0.18)', 1.26, 1.51, 1.80, 54],

        // Kata 30 Kg
        ['Kata 30 Kg', '30 Kg', 0.00, 1.08, 1.29, 55],
        ['Kata 30 Kg', 'Above 10 (+0.18)', 0.00, 1.26, 1.51, 56],

        // Kata 25/26 Kg
        ['Kata 25/26 Kg', '25/26 Kg', 0.75, 0.90, 1.08, 57],
        ['Kata 25/26 Kg', 'Above 12 (+0.15)', 0.90, 1.08, 1.29, 58],

        // Kata 10 Kg with 50 Kg bag packing
        ['Kata 10 Kg with 50 Kg bag packing', '10 Kg', 0.00, 0.65, 0.77, 59],
        ['Kata 10 Kg with 50 Kg bag packing', 'Above 15 (+0.10)', 0.00, 0.75, 0.89, 60],

        // Polish Kata 50/55 Kg with stich
        ['Polish Kata 50/55 Kg with stich', '50/55 Kg', 1.44, 1.73, 2.06, 61],
        ['Polish Kata 50/55 Kg with stich', 'Above 8 (+0.25)', 1.69, 2.03, 2.41, 62],

        // Frem kata with Nitt from rashi
        ['Frem kata with Nitt from rashi', '50 Kg', 1.80, 2.16, 2.57, 63],
        ['Frem kata with Nitt from rashi', '30 Kg', 0.00, 1.95, 2.32, 64],
        ['Frem kata with Nitt from rashi', '25/26 Kg', 1.36, 1.63, 1.94, 65],
        ['Frem kata with Nitt from rashi', '10 Kg', 0.00, 0.95, 1.13, 66],
        ['Frem kata with Nitt from rashi', 'Above 50 Kg', 2.52, 3.02, 3.60, 67],
        ['Frem kata with Nitt from rashi', 'Polish 50/55 Kg', 2.52, 3.02, 3.60, 68],
        ['Frem kata with Nitt from rashi', 'Above 100 Kg', 3.60, 4.32, 5.14, 69]
      ];

      for (const [work_type, work_detail, rate_18_21, rate_21_24, rate_24_27, display_order] of ratesData) {
        await sequelize.query(`
          INSERT INTO rice_hamali_rates (work_type, work_detail, rate_18_21, rate_21_24, rate_24_27, display_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `, {
          replacements: [work_type, work_detail, rate_18_21, rate_21_24, rate_24_27, display_order]
        });
      }
      
      console.log('✅ Complete rice hamali rates data inserted (69 work types)');
    } else {
      console.log('ℹ️ Rice hamali rates already complete, skipping');
    }

    // Verify final count
    const [finalCount] = await sequelize.query('SELECT COUNT(*) as count FROM rice_hamali_rates');
    console.log(`📊 Final rice hamali rates count: ${finalCount[0].count}`);

    console.log('✅ Complete Rice Hamali rates migration completed successfully');
    
  } catch (error) {
    console.error('❌ Error in Complete Rice Hamali rates migration:', error);
    throw error;
  }
}

async function down() {
  console.log('🔄 Removing complete Rice Hamali rates...');
  
  try {
    await sequelize.query('DELETE FROM rice_hamali_rates');
    console.log('✅ Complete Rice Hamali rates removed');
  } catch (error) {
    console.error('❌ Error removing complete Rice Hamali rates:', error);
    throw error;
  }
}

module.exports = { up, down };