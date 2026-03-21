'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        // Add close lot fields to lot_allotments table
        await queryInterface.addColumn('lot_allotments', 'inspected_bags', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
            comment: 'Total bags actually inspected before closing'
        });

        await queryInterface.addColumn('lot_allotments', 'closed_at', {
            type: Sequelize.DATE,
            allowNull: true,
            comment: 'When the lot was closed by manager'
        });

        await queryInterface.addColumn('lot_allotments', 'closed_by_user_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            comment: 'Manager who closed the lot'
        });

        await queryInterface.addColumn('lot_allotments', 'closed_reason', {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Reason for closing (e.g. Party only sent 2000 of 4000 bags)'
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn('lot_allotments', 'closed_reason');
        await queryInterface.removeColumn('lot_allotments', 'closed_by_user_id');
        await queryInterface.removeColumn('lot_allotments', 'closed_at');
        await queryInterface.removeColumn('lot_allotments', 'inspected_bags');
    }
};
