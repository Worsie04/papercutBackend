'use strict';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('templates', 'shared_users', {
            type: Sequelize.ARRAY(Sequelize.UUID),
            allowNull: true,
            defaultValue: [],
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('templates', 'shared_users');
    }
};
