const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For PostgreSQL, we need to alter the ENUM type
    // For MySQL/MariaDB, we can modify the column directly
    
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
      // PostgreSQL approach: Create new type, update column, drop old type
      await queryInterface.sequelize.query(`
        ALTER TYPE enum_purchase_rates_rate_type RENAME TO enum_purchase_rates_rate_type_old;
      `);
      
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_purchase_rates_rate_type AS ENUM('CDL', 'CDWB', 'MDL', 'MDWB');
      `);
      
      await queryInterface.sequelize.query(`
        ALTER TABLE purchase_rates 
        ALTER COLUMN rate_type TYPE enum_purchase_rates_rate_type 
        USING rate_type::text::enum_purchase_rates_rate_type;
      `);
      
      await queryInterface.sequelize.query(`
        DROP TYPE enum_purchase_rates_rate_type_old;
      `);
    } else {
      // MySQL/MariaDB approach: Modify column directly
      await queryInterface.changeColumn('purchase_rates', 'rate_type', {
        type: DataTypes.ENUM('CDL', 'CDWB', 'MDL', 'MDWB'),
        allowNull: false
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Rollback: Change CDWB back to CDWM
    const dialect = queryInterface.sequelize.getDialect();
    
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TYPE enum_purchase_rates_rate_type RENAME TO enum_purchase_rates_rate_type_old;
      `);
      
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_purchase_rates_rate_type AS ENUM('CDL', 'CDWM', 'MDL', 'MDWB');
      `);
      
      await queryInterface.sequelize.query(`
        ALTER TABLE purchase_rates 
        ALTER COLUMN rate_type TYPE enum_purchase_rates_rate_type 
        USING rate_type::text::enum_purchase_rates_rate_type;
      `);
      
      await queryInterface.sequelize.query(`
        DROP TYPE enum_purchase_rates_rate_type_old;
      `);
    } else {
      await queryInterface.changeColumn('purchase_rates', 'rate_type', {
        type: DataTypes.ENUM('CDL', 'CDWM', 'MDL', 'MDWB'),
        allowNull: false
      });
    }
  }
};
