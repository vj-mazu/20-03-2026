const { QueryInterface, Sequelize } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // First, check if the index already exists
      const indexes = await queryInterface.showIndex('Kunchinittus');
      const uniqueNameIndexExists = indexes.some(
        index => index.name === 'kunchinittus_name_unique'
      );

      if (!uniqueNameIndexExists) {
        console.log('Adding unique constraint on Kunchinittus.name...');
        
        // Add unique constraint on name column
        await queryInterface.addConstraint('Kunchinittus', {
          fields: ['name'],
          type: 'unique',
          name: 'kunchinittus_name_unique'
        });
        
        console.log('✅ Unique constraint added successfully');
      } else {
        console.log('⚠️  Unique constraint already exists, skipping');
      }
    } catch (error) {
      console.error('Error adding unique constraint:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeConstraint('Kunchinittus', 'kunchinittus_name_unique');
      console.log('✅ Unique constraint removed');
    } catch (error) {
      console.error('Error removing unique constraint:', error.message);
      throw error;
    }
  }
};
