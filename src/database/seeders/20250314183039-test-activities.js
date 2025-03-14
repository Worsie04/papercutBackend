'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Get a user ID from the database
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM users LIMIT 1',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    
    if (users.length === 0) {
      console.log('No users found in the database. Skipping activity creation.');
      return;
    }
    
    const userId = users[0].id;
    
    // Create a test activity
    await queryInterface.bulkInsert('activities', [{
      id: uuidv4(),
      userId: userId,
      action: 'CREATE',
      resourceType: 'SPACE',
      resourceId: uuidv4(),
      resourceName: 'Test Space',
      details: 'This is a test activity created by the seeder',
      status: 'completed',
      timestamp: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
    
    console.log('Test activity created successfully.');
  },

  async down (queryInterface, Sequelize) {
    // Remove the test activity
    await queryInterface.bulkDelete('activities', null, {});
  }
};
