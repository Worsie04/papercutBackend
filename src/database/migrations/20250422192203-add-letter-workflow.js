'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    const workflowStatusEnum = 'enum_letters_workflow_status';
    const reviewerStatusEnum = 'enum_letter_reviewers_status';
    const actionLogTypeEnum = 'enum_letter_action_logs_action_type';

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${workflowStatusEnum}') THEN
              CREATE TYPE ${workflowStatusEnum} AS ENUM('draft', 'pending_review', 'pending_approval', 'approved', 'rejected');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${reviewerStatusEnum}') THEN
              CREATE TYPE ${reviewerStatusEnum} AS ENUM('pending', 'approved', 'rejected', 'skipped', 'reassigned');
          END IF;
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${actionLogTypeEnum}') THEN
              CREATE TYPE ${actionLogTypeEnum} AS ENUM('submit', 'approve_review', 'reject_review', 'reassign_review', 'final_approve', 'final_reject', 'resubmit', 'comment', 'upload_revision');
          END IF;
      END $$;
    `);

    await queryInterface.addColumn('letters', 'workflow_status', {
      type: Sequelize.DataTypes.ENUM('draft', 'pending_review', 'pending_approval', 'approved', 'rejected'),
      allowNull: true,
      defaultValue: 'draft'
    });

    await queryInterface.addColumn('letters', 'current_step_index', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0
    });

    await queryInterface.addColumn('letters', 'next_action_by_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('letters', 'qr_code_url', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('letters', 'public_link', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('letters', 'final_signed_pdf_url', {
       type: Sequelize.STRING,
       allowNull: true
     });


    await queryInterface.createTable('letter_reviewers', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false
      },
      letter_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'letters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sequence_order: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.DataTypes.ENUM('pending', 'approved', 'rejected', 'skipped', 'reassigned'),
        allowNull: false,
        defaultValue: 'pending'
      },
      acted_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      reassigned_from_user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('letter_reviewers', ['letter_id', 'sequence_order']);
    await queryInterface.addIndex('letter_reviewers', ['letter_id']);
    await queryInterface.addIndex('letter_reviewers', ['user_id']);


    await queryInterface.createTable('letter_action_logs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('uuid_generate_v4()'),
        primaryKey: true,
        allowNull: false
      },
      letter_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'letters',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      action_type: {
         type: Sequelize.DataTypes.ENUM('submit', 'approve_review', 'reject_review', 'reassign_review', 'final_approve', 'final_reject', 'resubmit', 'comment', 'upload_revision'),
        allowNull: false
      },
      comment: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      details: {
        type: Sequelize.JSONB,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('letter_action_logs', ['letter_id']);
    await queryInterface.addIndex('letter_action_logs', ['user_id']);
    await queryInterface.addIndex('letter_action_logs', ['action_type']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('letters', 'workflow_status');
    await queryInterface.removeColumn('letters', 'current_step_index');
    await queryInterface.removeColumn('letters', 'next_action_by_id');
    await queryInterface.removeColumn('letters', 'qr_code_url');
    await queryInterface.removeColumn('letters', 'public_link');
    await queryInterface.removeColumn('letters', 'final_signed_pdf_url');

    await queryInterface.dropTable('letter_action_logs');
    await queryInterface.dropTable('letter_reviewers');

    const workflowStatusEnum = 'enum_letters_workflow_status';
    const reviewerStatusEnum = 'enum_letter_reviewers_status';
    const actionLogTypeEnum = 'enum_letter_action_logs_action_type';

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS ${workflowStatusEnum};`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS ${reviewerStatusEnum};`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS ${actionLogTypeEnum};`);
  }
};