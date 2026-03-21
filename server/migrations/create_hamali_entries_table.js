const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('hamali_entries', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      arrivalId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'arrivals',
          key: 'id'
        },
        onDelete: 'CASCADE',
        field: 'arrival_id'
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      
      // Loading Hamali
      hasLoadingHamali: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_loading_hamali'
      },
      loadingBags: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'loading_bags'
      },
      loadingRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'loading_rate'
      },
      loadingTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'loading_total'
      },
      
      // Unloading Hamali
      hasUnloadingHamali: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_unloading_hamali'
      },
      unloadingType: {
        type: DataTypes.ENUM('sada', 'kn'),
        allowNull: true,
        field: 'unloading_type'
      },
      unloadingBags: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'unloading_bags'
      },
      unloadingRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'unloading_rate'
      },
      unloadingTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'unloading_total'
      },
      
      // Loose Tumbiddu
      hasLooseTumbiddu: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'has_loose_tumbiddu'
      },
      looseBags: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'loose_bags'
      },
      looseRate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'loose_rate'
      },
      looseTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: 'loose_total'
      },
      
      // Total
      grandTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: 'grand_total'
      },
      
      createdBy: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        field: 'created_by'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'created_at'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updated_at'
      }
    });

    // Create indexes
    await queryInterface.addIndex('hamali_entries', ['arrival_id'], {
      unique: true,
      name: 'idx_hamali_entries_arrival'
    });
    await queryInterface.addIndex('hamali_entries', ['date'], {
      name: 'idx_hamali_entries_date'
    });
    await queryInterface.addIndex('hamali_entries', ['created_by'], {
      name: 'idx_hamali_entries_created_by'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('hamali_entries');
  }
};
