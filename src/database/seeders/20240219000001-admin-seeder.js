'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    return queryInterface.bulkInsert('admins', [
      {
        id: uuidv4(),
        email: 'admin@worsie.com',
        password: hashedPassword,
        first_name: 'Super',
        last_name: 'Admin',
        role: 'super_admin',
        permissions: ['all'],
        is_active: true,
        email_verified_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null
      }
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('admins', null, {});
  }
}; 