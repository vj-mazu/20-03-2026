const OtherHamaliWork = require('../models/OtherHamaliWork');

const defaultOtherHamaliWorks = [
  {
    workType: 'Plotting',
    workDetail: 'Plot marking and measurement',
    rate: 11.88,
    unit: 'per_bag'
  },
  {
    workType: 'Paddy Cutting',
    workDetail: 'Cutting paddy from field',
    rate: 2.06,
    unit: 'per_bag'
  },
  {
    workType: 'Paddy Filling with Stitching',
    workDetail: 'Filling bags and stitching',
    rate: 2.7,
    unit: 'per_bag'
  },
  {
    workType: 'Cleaning Work',
    workDetail: 'General cleaning and maintenance',
    rate: 5.0,
    unit: 'per_bag'
  },
  {
    workType: 'Transportation',
    workDetail: 'Moving goods within premises',
    rate: 3.5,
    unit: 'per_bag'
  }
];

const seedOtherHamaliWorks = async () => {
  try {
    console.log('🌱 Seeding other hamali works...');
    
    for (const work of defaultOtherHamaliWorks) {
      const existingWork = await OtherHamaliWork.findOne({
        where: {
          workType: work.workType,
          workDetail: work.workDetail
        }
      });
      
      if (!existingWork) {
        await OtherHamaliWork.create(work);
        console.log(`✅ Created: ${work.workType} - ${work.workDetail}`);
      } else {
        console.log(`⚠️ Already exists: ${work.workType} - ${work.workDetail}`);
      }
    }
    
    console.log('✅ Other hamali works seeding completed');
  } catch (error) {
    console.error('❌ Error seeding other hamali works:', error);
  }
};

module.exports = { seedOtherHamaliWorks };

// Run if called directly
if (require.main === module) {
  const { sequelize } = require('../config/database');
  
  sequelize.authenticate()
    .then(() => seedOtherHamaliWorks())
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Database connection failed:', error);
      process.exit(1);
    });
}