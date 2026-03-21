const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Create other_hamali_works table for work types and rates
    await queryInterface.createTable('other_hamali_works', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      work_type: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      work_detail: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      rate: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
          isDecimal: true
        }
      },
      unit: {
        type: DataTypes.ENUM('per_bag', 'per_lorry', 'per_quintal', 'fixed'),
        defaultValue: 'per_bag',
        allowNull: false
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('other_hamali_works', ['work_type'], {
      name: 'idx_other_hamali_works_type'
    });

    await queryInterface.addIndex('other_hamali_works', ['is_active'], {
      name: 'idx_other_hamali_works_active'
    });

    // Insert default work types based on your image
    await queryInterface.bulkInsert('other_hamali_works', [
      {
        work_type: 'Paddy Loading',
        work_detail: 'Lorry Loading',
        rate: 4.63,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Loose Tumbiddu',
        work_detail: 'Per Bag',
        rate: 4.94,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Paddy Unloading',
        work_detail: 'Sada',
        rate: 4.11,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Paddy Unloading',
        work_detail: 'KN (0 to 18 height)',
        rate: 7.71,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Paddy Unloading',
        work_detail: 'KN (above 18 height)',
        rate: 3.6,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Paddy Cutting',
        work_detail: 'Paddy Cutting',
        rate: 2.06,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Plotting',
        work_detail: 'per bag',
        rate: 11.88,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Paddy Shifting',
        work_detail: 'Sada',
        rate: 3.52,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Paddy Shifting',
        work_detail: 'KN (0 to 18 height)',
        rate: 4.31,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        work_type: 'Paddy Filling with Stitching',
        work_detail: 'From Rashi/Bunker',
        rate: 3.7,
        unit: 'per_bag',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ Created other_hamali_works table with default work types');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('other_hamali_works');
  }
};