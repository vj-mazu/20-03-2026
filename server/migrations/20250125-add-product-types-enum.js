'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // For PostgreSQL/MySQL with ENUMs, we need to ALTER the enum type to add new values
        // This migration adds: 'RJ Broken', '0 Broken', 'RJ Rice (2)', 'Unpolish'

        const dialect = queryInterface.sequelize.options.dialect;

        if (dialect === 'postgres') {
            // PostgreSQL: Add new enum values to the existing enum type
            await queryInterface.sequelize.query(`
        ALTER TYPE "enum_rice_productions_productType" ADD VALUE IF NOT EXISTS 'RJ Broken';
      `).catch(e => console.log('RJ Broken already exists or error:', e.message));

            await queryInterface.sequelize.query(`
        ALTER TYPE "enum_rice_productions_productType" ADD VALUE IF NOT EXISTS '0 Broken';
      `).catch(e => console.log('0 Broken already exists or error:', e.message));

            await queryInterface.sequelize.query(`
        ALTER TYPE "enum_rice_productions_productType" ADD VALUE IF NOT EXISTS 'RJ Rice (2)';
      `).catch(e => console.log('RJ Rice (2) already exists or error:', e.message));

            await queryInterface.sequelize.query(`
        ALTER TYPE "enum_rice_productions_productType" ADD VALUE IF NOT EXISTS 'Unpolish';
      `).catch(e => console.log('Unpolish already exists or error:', e.message));

            console.log('✅ Product type ENUM updated for PostgreSQL');
        } else if (dialect === 'mysql' || dialect === 'mariadb') {
            // MySQL: Modify the column to have the updated enum values
            await queryInterface.changeColumn('rice_productions', 'productType', {
                type: Sequelize.ENUM(
                    'Rice', 'Bran', 'Farm Bran', 'Rejection Rice', 'Sizer Broken',
                    'Rejection Broken', 'RJ Broken', 'Broken', 'Zero Broken', '0 Broken',
                    'Faram', 'Unpolished', 'RJ Rice 1', 'RJ Rice 2', 'RJ Rice (2)', 'Unpolish'
                ),
                allowNull: false
            });
            console.log('✅ Product type ENUM updated for MySQL');
        } else if (dialect === 'sqlite') {
            // SQLite doesn't support ENUM, it stores as VARCHAR - no migration needed
            console.log('ℹ️ SQLite detected - no ENUM migration needed (stored as TEXT)');
        } else {
            console.log('ℹ️ Unknown dialect:', dialect, '- skipping ENUM migration');
        }
    },

    async down(queryInterface, Sequelize) {
        // Note: Removing enum values is complex and may require data migration
        // This down migration is a no-op to prevent data loss
        console.log('⚠️ Down migration for ENUM changes is not supported to prevent data loss');
    }
};
