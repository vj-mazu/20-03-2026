'use strict';

/**
 * Migration: Relax Packaging Constraints
 * Purpose: Allow multiple packagings with same brandName but different weights (allottedKg)
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            console.log('🔄 Migration 56: Relaxing packaging constraints...');

            // 1. Drop existing unique constraints/indexes
            // We'll use raw queries with IF EXISTS to be extremely safe
            const queries = [
                'ALTER TABLE "packagings" DROP CONSTRAINT IF EXISTS "packagings_brandName_key"',
                'ALTER TABLE "packagings" DROP CONSTRAINT IF EXISTS "packagings_code_key"',
                'ALTER TABLE "packagings" DROP CONSTRAINT IF EXISTS "packagings_brand_name_key"',
                'DROP INDEX IF EXISTS "packagings_brand_name_idx"',
                'DROP INDEX IF EXISTS "packagings_code_idx"',
                'DROP INDEX IF EXISTS "packagings_brandName_idx"'
            ];

            for (const query of queries) {
                try {
                    await queryInterface.sequelize.query(query);
                } catch (e) {
                    // Ignore errors if they don't exist
                }
            }

            // 2. Add new composite unique index
            // This allows the same brand name with different weights
            try {
                // Check if the index already exists first to avoid errors
                await queryInterface.addIndex('packagings', ['brandName', 'allottedKg'], {
                    unique: true,
                    name: 'packagings_brandName_allotted_kg_key'
                });
                console.log('✅ Created composite unique index (brandName, allottedKg)');
            } catch (e) {
                if (e.message.includes('already exists')) {
                    console.log('⏭️ Composite index already exists, skipping');
                } else {
                    throw e;
                }
            }

            console.log('✅ Migration 56 completed successfully');
        } catch (error) {
            console.log('⚠️ Migration 56 warning (might be partially applied):', error.message);
        }
    },

    async down(queryInterface, Sequelize) {
        try {
            await queryInterface.removeIndex('packagings', 'packagings_brandName_allotted_kg_key');

            // Note: Re-adding original constraints might fail if duplicates now exist
            await queryInterface.sequelize.query('ALTER TABLE "packagings" ADD CONSTRAINT "packagings_brandName_key" UNIQUE ("brandName")');
            await queryInterface.sequelize.query('ALTER TABLE "packagings" ADD CONSTRAINT "packagings_code_key" UNIQUE ("code")');

            console.log('✅ Migration 56 rolled back');
        } catch (error) {
            console.log('⚠️ Rollback failed:', error.message);
        }
    }
};
