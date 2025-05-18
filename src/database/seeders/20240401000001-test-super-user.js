'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    const hashedPassword = await bcrypt.hash('Test123!', 10);

    // Create a test user
    const userId = uuidv4();
    await queryInterface.bulkInsert('users', [
      {
        id: userId,
        email: 'mamedov@gmail.com',
        password: hashedPassword,
        first_name: 'Test',
        last_name: 'User',
        is_active: true,
        email_verified_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null
      }
    ]);

    // Find the super_user role
    const roles = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'super_user'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (roles.length > 0) {
      // Assign the super_user role to the test user
      await queryInterface.bulkInsert('user_roles', [
        {
          id: uuidv4(),
          user_id: userId,
          role_id: roles[0].id,
          created_at: now,
          updated_at: now
        }
      ]);
    }

    return Promise.resolve();
  },

  down: async (queryInterface, Sequelize) => {
    // Find the test user
    const users = await queryInterface.sequelize.query(
      `SELECT id FROM users WHERE email = 'mamedov@gmail.com'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (users.length > 0) {
      // Delete the user's roles
      await queryInterface.bulkDelete('user_roles', {
        user_id: users[0].id
      });

      // Delete the user
      await queryInterface.bulkDelete('users', {
        email: 'mamedov@gmail.com'
      });
    }

    return Promise.resolve();
  }
};
