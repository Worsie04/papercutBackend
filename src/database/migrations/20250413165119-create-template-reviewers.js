'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('template_reviewers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      template_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'templates', // 'templates' cədvəlinə istinad
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Əsas şablon silindikdə əlaqəli reviewer qeydləri də silinsin
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users', // 'users' cədvəlinə istinad
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // İstifadəçi silindikdə əlaqəli reviewer qeydləri də silinsin
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Eyni user-in eyni template-ə təkrar əlavə edilməsinin qarşısını almaq üçün unikal məhdudiyyət
    await queryInterface.addConstraint('template_reviewers', {
      fields: ['template_id', 'user_id'],
      type: 'unique',
      name: 'template_reviewers_template_user_unique_constraint',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('template_reviewers', 'template_reviewers_template_user_unique_constraint');
    await queryInterface.dropTable('template_reviewers');
  }
};