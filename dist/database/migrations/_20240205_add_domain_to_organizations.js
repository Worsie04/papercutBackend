'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // First, add the column as nullable
        await queryInterface.addColumn('organizations', 'domain', {
            type: Sequelize.STRING,
            allowNull: true,
            validate: {
                is: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i
            }
        });
        // Update existing records with a default domain based on their name
        await queryInterface.sequelize.query(`
      UPDATE organizations 
      SET domain = LOWER(
        REGEXP_REPLACE(
          REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '-'),
          '-+',
          '-'
        ) || '.example.com'
      )
      WHERE domain IS NULL;
    `);
        // Then make it non-nullable
        await queryInterface.changeColumn('organizations', 'domain', {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                is: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('organizations', 'domain');
    }
};
