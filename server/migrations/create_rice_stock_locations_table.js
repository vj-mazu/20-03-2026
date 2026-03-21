const { sequelize } = require('../config/database');

module.exports = {
  up: async () => {
    const queryInterface = sequelize.getQueryInterface();
    
    try {
      console.log('🔄 Creating rice_stock_locations table...');
      
      // Check if table exists
      const tables = await queryInterface.showAllTables();
      if (tables.includes('rice_stock_locations')) {
        console.log('⚠️ rice_stock_locations table already exists, skipping creation');
        return;
      }
      
      await queryInterface.createTable('rice_stock_locations', {
        id: {
          type: sequelize.Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        code: {
          type: sequelize.Sequelize.STRING(20),
          allowNull: false,
          unique: true
        },
        name: {
          type: sequelize.Sequelize.STRING(100),
          allowNull: true
        },
        isActive: {
          type: sequelize.Sequelize.BOOLEAN,
          defaultValue: true,
          field: 'is_active'
        },
        createdBy: {
          type: sequelize.Sequelize.INTEGER,
          allowNull: false,
          field: 'created_by',
          references: {
            model: 'users',
            key: 'id'
          }
        },
        createdAt: {
          type: sequelize.Sequelize.DATE,
          allowNull: false,
          field: 'created_at'
        },
        updatedAt: {
          type: sequelize.Sequelize.DATE,
          allowNull: false,
          field: 'updated_at'
        }
      });
      
      // Add indexes with existence check
      try {
        await queryInterface.addIndex('rice_stock_locations', ['code'], {
          name: 'idx_rice_stock_locations_code',
          unique: true
        });
      } catch (err) {
        if (!err.message.includes('already exists')) throw err;
        console.log('⚠️ Index idx_rice_stock_locations_code already exists');
      }
      
      try {
        await queryInterface.addIndex('rice_stock_locations', ['is_active'], {
          name: 'idx_rice_stock_locations_active'
        });
      } catch (err) {
        if (!err.message.includes('already exists')) throw err;
        console.log('⚠️ Index idx_rice_stock_locations_active already exists');
      }
      
      console.log('✅ rice_stock_locations table created successfully');
      
    } catch (error) {
      console.error('❌ Error creating rice_stock_locations table:', error.message);
      // Don't throw if table already exists
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  },
  
  down: async () => {
    const queryInterface = sequelize.getQueryInterface();
    
    try {
      await queryInterface.dropTable('rice_stock_locations');
      console.log('✅ rice_stock_locations table dropped');
    } catch (error) {
      console.error('❌ Error dropping rice_stock_locations table:', error.message);
      throw error;
    }
  }
};
