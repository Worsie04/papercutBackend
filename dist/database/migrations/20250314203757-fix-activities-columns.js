'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            // Check if activities table exists
            const tableExists = await queryInterface.sequelize.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activities')", { type: queryInterface.sequelize.QueryTypes.SELECT });
            if (!tableExists[0].exists) {
                console.log('Activities table does not exist. Skipping column fixes.');
                return;
            }
            // Check if the userId column exists (camelCase)
            const userIdColumnExists = await queryInterface.sequelize.query(`SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'activities' AND column_name = 'userId'
        )`, { type: queryInterface.sequelize.QueryTypes.SELECT });
            // If camelCase column exists, rename it to snake_case
            if (userIdColumnExists[0].exists) {
                await queryInterface.renameColumn('activities', 'userId', 'user_id');
                console.log('Renamed column userId to user_id');
            }
            // Check for other camelCase columns and rename them if they exist
            const columns = [
                { from: 'resourceType', to: 'resource_type' },
                { from: 'resourceId', to: 'resource_id' },
                { from: 'resourceName', to: 'resource_name' },
                { from: 'createdAt', to: 'created_at' },
                { from: 'updatedAt', to: 'updated_at' }
            ];
            for (const column of columns) {
                const columnExists = await queryInterface.sequelize.query(`SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'activities' AND column_name = '${column.from}'
          )`, { type: queryInterface.sequelize.QueryTypes.SELECT });
                if (columnExists[0].exists) {
                    await queryInterface.renameColumn('activities', column.from, column.to);
                    console.log(`Renamed column ${column.from} to ${column.to}`);
                }
            }
            console.log('Activities table columns fixed successfully.');
        }
        catch (error) {
            console.error('Error fixing activities table columns:', error);
        }
    },
    async down(queryInterface, Sequelize) {
        try {
            // Check if activities table exists
            const tableExists = await queryInterface.sequelize.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activities')", { type: queryInterface.sequelize.QueryTypes.SELECT });
            if (!tableExists[0].exists) {
                console.log('Activities table does not exist. Skipping column revert.');
                return;
            }
            // Revert column names from snake_case back to camelCase
            const columns = [
                { from: 'user_id', to: 'userId' },
                { from: 'resource_type', to: 'resourceType' },
                { from: 'resource_id', to: 'resourceId' },
                { from: 'resource_name', to: 'resourceName' },
                { from: 'created_at', to: 'createdAt' },
                { from: 'updated_at', to: 'updatedAt' }
            ];
            for (const column of columns) {
                const columnExists = await queryInterface.sequelize.query(`SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'activities' AND column_name = '${column.from}'
          )`, { type: queryInterface.sequelize.QueryTypes.SELECT });
                if (columnExists[0].exists) {
                    await queryInterface.renameColumn('activities', column.from, column.to);
                    console.log(`Reverted column ${column.from} to ${column.to}`);
                }
            }
            console.log('Activities table columns reverted successfully.');
        }
        catch (error) {
            console.error('Error reverting activities table columns:', error);
        }
    }
};
