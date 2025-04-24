'use strict';
const enumName = 'enum_notifications_type';
const newValues = [
    'letter_review_request',
    'letter_review_approved',
    'letter_review_rejected',
    'letter_final_approved',
    'letter_final_rejected'
];
module.exports = {
    async up(queryInterface, Sequelize) {
        for (const newValue of newValues) {
            try {
                await queryInterface.sequelize.query(`
          DO $$
          BEGIN
              ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${newValue}';
          EXCEPTION
              WHEN duplicate_object THEN null;
          END $$;
        `);
            }
            catch (e) {
                if (e.message.includes("already exists")) {
                    console.log(`Value ${newValue} already exists in enum ${enumName}, skipping.`);
                }
                else if (e.message.includes("cannot run inside a transaction block")) {
                    console.warn(`Could not run ALTER TYPE for ${newValue} inside transaction block. Consider running manually or adjusting migration setup.`);
                    // Optionally, attempt to run outside transaction if applicable to your setup
                    // await queryInterface.sequelize.query(`ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${newValue}';`);
                }
                else {
                    throw e;
                }
            }
        }
    },
    async down(queryInterface, Sequelize) {
        console.log(`Note: Removing enum values from '${enumName}' is not automatically done in this 'down' migration.`);
    }
};
