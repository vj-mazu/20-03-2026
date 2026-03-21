const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

async function addLinkedShiftingId() {
  const queryInterface = sequelize.getQueryInterface();

  try {
    console.log('Adding linkedShiftingId column to arrivals table...');

    // Check if column already exists
    const tableDesc = await queryInterface.describeTable('arrivals');
    
    if (!tableDesc.linkedShiftingId) {
      await queryInterface.addColumn('arrivals', 'linkedShiftingId', {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'arrivals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });

      console.log('✓ linkedShiftingId column added successfully');
    } else {
      console.log('✓ linkedShiftingId column already exists');
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

module.exports = { addLinkedShiftingId };

// Run if executed directly
if (require.main === module) {
  addLinkedShiftingId()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch(err => {
      console.error('Error:', err);
      process.exit(1);
    });
}
