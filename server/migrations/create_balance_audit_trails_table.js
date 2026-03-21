const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Create balance_audit_trails table
      await queryInterface.createTable('balance_audit_trails', {
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
        transactionId: {
          type: DataTypes.INTEGER,
          allowNull: true,
          references: {
            model: 'arrivals',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        actionType: {
          type: DataTypes.ENUM('opening_balance', 'transaction', 'recalculation', 'manual_adjustment'),
          allowNull: false
        },
        previousBalance: {
          type: DataTypes.JSON,
          allowNull: true
        },
        newBalance: {
          type: DataTypes.JSON,
          allowNull: false
        },
        balanceChange: {
          type: DataTypes.JSON,
          allowNull: true
        },
        performedBy: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        performedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        remarks: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        metadata: {
          type: DataTypes.JSON,
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
      console.log('✅ Created balance_audit_trails table');

      // Add indexes for performance
      await queryInterface.addIndex('balance_audit_trails', ['kunchinintuId'], {
        name: 'idx_balance_audit_trails_kunchinittu'
      });
      
      await queryInterface.addIndex('balance_audit_trails', ['transactionId'], {
        name: 'idx_balance_audit_trails_transaction'
      });
      
      await queryInterface.addIndex('balance_audit_trails', ['actionType'], {
        name: 'idx_balance_audit_trails_action_type'
      });
      
      await queryInterface.addIndex('balance_audit_trails', ['performedBy'], {
        name: 'idx_balance_audit_trails_performed_by'
      });
      
      await queryInterface.addIndex('balance_audit_trails', ['performedAt'], {
        name: 'idx_balance_audit_trails_performed_at'
      });
      
      await queryInterface.addIndex('balance_audit_trails', ['kunchinintuId', 'performedAt'], {
        name: 'idx_balance_audit_trails_kunchinittu_performed_at'
      });
      
      await queryInterface.addIndex('balance_audit_trails', ['actionType', 'performedAt'], {
        name: 'idx_balance_audit_trails_action_type_performed_at'
      });
      
      console.log('✅ Added indexes for balance_audit_trails table');

    } catch (error) {
      console.error('❌ Error creating balance_audit_trails table:', error.message);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Drop indexes first
      await queryInterface.removeIndex('balance_audit_trails', 'idx_balance_audit_trails_kunchinittu');
      await queryInterface.removeIndex('balance_audit_trails', 'idx_balance_audit_trails_transaction');
      await queryInterface.removeIndex('balance_audit_trails', 'idx_balance_audit_trails_action_type');
      await queryInterface.removeIndex('balance_audit_trails', 'idx_balance_audit_trails_performed_by');
      await queryInterface.removeIndex('balance_audit_trails', 'idx_balance_audit_trails_performed_at');
      await queryInterface.removeIndex('balance_audit_trails', 'idx_balance_audit_trails_kunchinittu_performed_at');
      await queryInterface.removeIndex('balance_audit_trails', 'idx_balance_audit_trails_action_type_performed_at');
      console.log('✅ Removed indexes for balance_audit_trails table');

      // Drop table
      await queryInterface.dropTable('balance_audit_trails');
      console.log('✅ Dropped balance_audit_trails table');

    } catch (error) {
      console.error('❌ Error dropping balance_audit_trails table:', error.message);
      throw error;
    }
  }
};