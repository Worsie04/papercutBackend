'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // First check if the table exists
    const tableExists = await queryInterface.showAllTables()
      .then(tables => tables.includes('cabinet_members'));

    if (!tableExists) {
      await queryInterface.createTable('cabinet_members', {
        cabinet_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          references: {
            model: 'cabinets',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        user_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        role: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'member',
        },
        permissions: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {
            canRead: true,
            canWrite: false,
            canDelete: false,
            canShare: false,
          },
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });

      // Add indexes
      await queryInterface.addIndex('cabinet_members', ['cabinet_id']);
      await queryInterface.addIndex('cabinet_members', ['user_id']);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cabinet_members');
  }
};
