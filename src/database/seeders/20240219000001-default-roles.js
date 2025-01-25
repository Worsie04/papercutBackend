'use strict';
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    const roles = [
      {
        id: uuidv4(),
        name: 'system_admin',
        description: 'Responsible for administrating the application',
        permissions: ['all'],
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'super_user',
        description: 'Can access enhanced settings, create and manage Spaces',
        permissions: ['manage_spaces', 'manage_users', 'manage_settings'],
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'owner',
        description: 'Creates and manages cabinet with full privileges',
        permissions: ['manage_cabinet', 'manage_records', 'download_files', 'export_tables'],
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'co_owner',
        description: 'Has Owner privileges except ownership management',
        permissions: ['manage_records', 'download_files', 'export_tables'],
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'member_full',
        description: 'Can read and write but not delete data',
        permissions: ['write_records', 'read_records', 'download_files', 'export_tables'],
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'member_read',
        description: 'Has read-only access with download permissions',
        permissions: ['read_records', 'download_files', 'export_tables'],
        is_system: true,
        created_at: now,
        updated_at: now
      },
      {
        id: uuidv4(),
        name: 'guest',
        description: 'Temporary read-only access with time limitation',
        permissions: ['read_records'],
        is_system: true,
        created_at: now,
        updated_at: now
      }
    ];

    await queryInterface.bulkInsert('roles', roles, {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('roles', {
      name: {
        [Sequelize.Op.in]: [
          'system_admin',
          'super_user',
          'owner',
          'co_owner',
          'member_full',
          'member_read',
          'guest'
        ]
      }
    });
  }
}; 