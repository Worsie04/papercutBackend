'use strict';
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // Create test user
    const userId = uuidv4();
    const user = {
      id: userId,
      first_name: 'Test',
      last_name: 'Super User',
      email: 'test.super@example.com',
      password: await bcrypt.hash('Test123!@#', 10),
      is_active: true,
      created_at: now,
      updated_at: now
    };

    // Find super_user role
    const superUserRole = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'super_user' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (!superUserRole.length) {
      throw new Error('super_user role not found');
    }

    // Create user-role association
    const userRole = {
      id: uuidv4(),
      user_id: userId,
      role_id: superUserRole[0].id,
      created_at: now,
      updated_at: now
    };

    // Insert the data
    await queryInterface.bulkInsert('users', [user], {});
    await queryInterface.bulkInsert('user_roles', [userRole], {});
  },

  down: async (queryInterface, Sequelize) => {
    // Find the user ID
    const user = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'test.super@example.com' LIMIT 1;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (user.length) {
      // Delete user role associations
      await queryInterface.bulkDelete('user_roles', {
        user_id: user[0].id
      });

      // Delete user
      await queryInterface.bulkDelete('users', {
        email: 'test.super@example.com'
      });
    }
  }
}; 