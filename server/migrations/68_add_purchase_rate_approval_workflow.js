'use strict';

/**
 * Migration: Add approval workflow fields to purchase_rates table
 * 
 * This adds status, admin_approved_by, and admin_approved_at columns
 * to support the admin approval workflow for purchase rates.
 */

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            // Check if status column already exists
            const tableInfo = await queryInterface.describeTable('purchase_rates');

            if (!tableInfo.status) {
                // Create ENUM type for SQLite compatibility (handled automatically by Sequelize)
                await queryInterface.addColumn('purchase_rates', 'status', {
                    type: Sequelize.ENUM('pending', 'approved', 'rejected'),
                    allowNull: false,
                    defaultValue: 'approved' // Existing records are already approved
                }, { transaction });
            }

            if (!tableInfo.admin_approved_by) {
                await queryInterface.addColumn('purchase_rates', 'admin_approved_by', {
                    type: Sequelize.INTEGER,
                    allowNull: true,
                    references: {
                        model: 'users',
                        key: 'id'
                    }
                }, { transaction });
            }

            if (!tableInfo.admin_approved_at) {
                await queryInterface.addColumn('purchase_rates', 'admin_approved_at', {
                    type: Sequelize.DATE,
                    allowNull: true
                }, { transaction });
            }

            // Update existing records to be approved by admin (they were created before this workflow)
            await queryInterface.sequelize.query(`
        UPDATE purchase_rates 
        SET status = 'approved',
            admin_approved_by = created_by,
            admin_approved_at = created_at
        WHERE status IS NULL OR status = 'pending'
      `, { transaction });

            // Add index for status column for faster filtering
            try {
                await queryInterface.addIndex('purchase_rates', ['status'], {
                    name: 'idx_purchase_rates_status',
                    transaction
                });
            } catch (e) {
                console.log('Index may already exist, continuing...');
            }

            await transaction.commit();
            console.log('✅ Migration completed: Added purchase rate approval fields');
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();

        try {
            const tableInfo = await queryInterface.describeTable('purchase_rates');

            if (tableInfo.status) {
                await queryInterface.removeColumn('purchase_rates', 'status', { transaction });
            }

            if (tableInfo.admin_approved_by) {
                await queryInterface.removeColumn('purchase_rates', 'admin_approved_by', { transaction });
            }

            if (tableInfo.admin_approved_at) {
                await queryInterface.removeColumn('purchase_rates', 'admin_approved_at', { transaction });
            }

            await transaction.commit();
            console.log('✅ Rollback completed: Removed purchase rate approval fields');
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};
