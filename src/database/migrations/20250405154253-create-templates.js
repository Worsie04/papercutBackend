'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('templates', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      sections: {
        type: Sequelize.JSONB, // PostgreSQL üçün JSONB istifadə edirik
        allowNull: false,
      },
      user_id: { // underscored: true olduğu üçün snake_case
        type: Sequelize.UUID, // User ID tipi ilə eyni olmalıdır
        allowNull: false,
        references: {
          model: 'users', // 'users' cədvəlinin adı (modeldəki ilə eyni)
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // İstifadəçi silindikdə şablonlar da silinsin
      },
      created_at: { // underscored: true
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: { // underscored: true
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // user_id üzrə indeks əlavə etmək performansı artıra bilər
    await queryInterface.addIndex('templates', ['user_id']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('templates');
  }
};
