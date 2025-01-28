'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
module.exports = {
    up: async (queryInterface, Sequelize) => {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123!', salt);
        const now = new Date();
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
                updated_at: now
            }
        ]);
    },
    down: async (queryInterface, Sequelize) => {
        return queryInterface.bulkDelete('admins', null, {});
    }
};
