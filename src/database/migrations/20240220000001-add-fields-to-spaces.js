'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('spaces', 'company', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('spaces', 'tags', {
      type: Sequelize.ARRAY(Sequelize.STRING),
      allowNull: false,
      defaultValue: [],
    });

    await queryInterface.addColumn('spaces', 'country', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'US',
    });

    await queryInterface.addColumn('spaces', 'logo', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn('spaces', 'require_approval', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('spaces', 'company');
    await queryInterface.removeColumn('spaces', 'tags');
    await queryInterface.removeColumn('spaces', 'country');
    await queryInterface.removeColumn('spaces', 'logo');
    await queryInterface.removeColumn('spaces', 'require_approval');
  }
}; 