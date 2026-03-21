'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.addColumn('sample_entries', 'lot_selection_decision', {
            type: Sequelize.ENUM('PASS_WITHOUT_COOKING', 'PASS_WITH_COOKING', 'FAIL'),
            allowNull: true
        });

        await queryInterface.addColumn('sample_entries', 'lot_selection_by_user_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
        });

        await queryInterface.addColumn('sample_entries', 'lot_selection_at', {
            type: Sequelize.DATE,
            allowNull: true
        });
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('sample_entries', 'lot_selection_decision');
        await queryInterface.removeColumn('sample_entries', 'lot_selection_by_user_id');
        await queryInterface.removeColumn('sample_entries', 'lot_selection_at');

        // We might need to drop the enum type in some SQL dialects, 
        // but column removal is usually sufficient for Sequelize transitions.
    }
};
