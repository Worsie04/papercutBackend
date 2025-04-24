'use strict';
const enumName = 'enum_activities_resource_type';
const newValue = 'LETTER';
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${newValue}';
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);
    },
    async down(queryInterface, Sequelize) {
        // Down migration for removing enum values is complex and often avoided.
        // console.log(`Note: Removing enum value '${newValue}' from '${enumName}' is not automatically done.`);
    }
};
