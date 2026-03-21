const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Create opening_balances table
      await queryInterface.createTable('opening_balances', {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        kunchinintuId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'kunchinittus',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false
        },
        openingBags: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        openingNetWeight: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.00
        },
        isManual: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdBy: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        remarks: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
      console.log('✅ Created opening_balances table');

      // Add unique constraint on kunchinintuId + date
      await queryInterface.addConstraint('opening_balances', {
        fields: ['kunchinintuId', 'date'],
        type: 'unique',
        name: 'unique_kunchinittu_date'
      });
      console.log('✅ Added unique constraint on kunchinintuId + date');

      // Add indexes for performance
      await queryInterface.addIndex('opening_balances', ['kunchinintuId'], {
        name: 'idx_opening_balances_kunchinittu'
      });
      
      await queryInterface.addIndex('opening_balances', ['date'], {
        name: 'idx_opening_balances_date'
      });
      
      await queryInterface.addIndex('opening_balances', ['createdBy'], {
        name: 'idx_opening_balances_created_by'
      });
      
      await queryInterface.addIndex('opening_balances', ['isManual'], {
        name: 'idx_opening_balances_is_manual'
      });
      
      await queryInterface.addIndex('opening_balances', ['createdAt'], {
        name: 'idx_opening_balances_created_at'
      });
      
      console.log('✅ Added indexes for opening_balances table');

    } catch (error) {
      console.error('❌ Error creating opening_balances table:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Drop indexes first
      await queryInterface.removeIndex('opening_balances', 'idx_opening_balances_kunchinittu');
      await queryInterface.removeIndex('opening_balances', 'idx_opening_balances_date');
      await queryInterface.removeIndex('opening_balances', 'idx_opening_balances_created_by');
      await queryInterface.removeIndex('opening_balances', 'idx_opening_balances_is_manual');
      await queryInterface.removeIndex('opening_balances', 'idx_opening_balances_created_at');
      console.log('✅ Removed indexes for opening_balances table');

      // Remove unique constraint
      await queryInterface.removeConstraint('opening_balances', 'unique_kunchinittu_date');
      console.log('✅ Removed unique constraint');

      // Drop table
      await queryInterface.dropTable('opening_balances');
      console.log('✅ Dropped opening_balances table');

    } catch (error) {
      console.error('❌ Error dropping opening_balances table:', error.message);
      throw error;
    }
  }
};