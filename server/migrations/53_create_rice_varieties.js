'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('rice_varieties', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            name: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true
            },
            code: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true
            },
            isActive: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });

        await queryInterface.addIndex('rice_varieties', ['name'], { unique: true });
        await queryInterface.addIndex('rice_varieties', ['code'], { unique: true });
        await queryInterface.addIndex('rice_varieties', ['isActive']);
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('rice_varieties');
    }
};
