'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Check if activities table exists
      const tableExists = await queryInterface.sequelize.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activities')",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (!tableExists[0].exists) {
        console.log('Activities table does not exist. Skipping enum update.');
        return;
      }

      // Check if the enum value already exists
      const enumExists = await queryInterface.sequelize.query(
        `SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'reassigned' 
          AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'enum_activities_status'
          )
        )`,
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );

      if (enumExists[0].exists) {
        console.log('Enum value "reassigned" already exists in enum_activities_status.');
        return;
      }

      // Add 'reassigned' to the enum_activities_status enum
      await queryInterface.sequelize.query(
        `ALTER TYPE enum_activities_status ADD VALUE 'reassigned'`
      );

      console.log('Successfully added "reassigned" to enum_activities_status enum.');
      
    } catch (error) {
      console.error('Error adding reassigned to activity status enum:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Note: PostgreSQL does not support removing enum values directly
      // If you need to remove this value, you would need to:
      // 1. Create a new enum without 'reassigned'
      // 2. Update all columns using the old enum to use the new enum
      // 3. Drop the old enum
      // This is a complex operation and is not implemented here
      console.log('Cannot remove enum value "reassigned" - PostgreSQL does not support removing enum values');
      console.log('If you need to remove this, you would need to recreate the enum entirely');
    } catch (error) {
      console.error('Error in down migration:', error);
      throw error;
    }
  }
}; 