'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if column exists
    const tableInfo = await queryInterface.describeTable('cabinets');
    const columnExists = tableInfo['created_by_id'] !== undefined;

    if (!columnExists) {
      // Add the column if it doesn't exist
      await queryInterface.addColumn('cabinets', 'created_by_id', {
        type: Sequelize.UUID,
        allowNull: true,  // temporarily allow null
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }

    // Get the first user's ID to use as default
    const [users] = await queryInterface.sequelize.query(
      `SELECT id FROM users LIMIT 1;`
    );
    
    const userId = users[0]?.id;

    if (userId) {
      // Update existing records with the user
      await queryInterface.sequelize.query(
        `UPDATE cabinets SET created_by_id = :userId WHERE created_by_id IS NULL`,
        {
          replacements: { userId },
        }
      );
    }

    if (!columnExists) {
      // Make the column non-nullable only if we created it
      await queryInterface.changeColumn('cabinets', 'created_by_id', {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('cabinets');
    if (tableInfo['created_by_id'] !== undefined) {
      await queryInterface.removeColumn('cabinets', 'created_by_id');
    }
  }
}; 