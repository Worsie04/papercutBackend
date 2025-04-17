"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notification = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const base_model_1 = require("./base.model");
const NotificationTypes = [
    // Existing Space types
    'space_approval', 'space_rejection', 'space_reassignment', 'space_creation', 'space_deletion',
    // Existing Cabinet types
    'cabinet_approval', 'cabinet_rejection', 'cabinet_reassignment', 'cabinet_creation', 'cabinet_deletion', 'cabinet_update', 'cabinet_resubmitted',
    // Existing Record types
    'record_approval', 'record_rejection', 'record_reassignment', 'record_creation', 'record_deletion', 'record_update', 'record_modification',
    // Existing Template types
    'template_share', 'template_update', 'template_delete',
    // --- NEW Letter Types ---
    'letter_review_request', // Sent to reviewers when a letter is submitted
    'letter_review_approved', // Sent to submitter when reviewers approve
    'letter_review_rejected', // Sent to submitter when reviewers reject
    'letter_final_approved', // Sent to submitter on final approval
    'letter_final_rejected',
];
class Notification extends base_model_1.BaseModel {
}
exports.Notification = Notification;
Notification.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'CASCADE',
        field: 'user_id',
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('space_approval', 'space_rejection', 'space_reassignment', 'space_creation', 'space_deletion'),
        allowNull: false,
    },
    read: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    entityType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        field: 'entity_type',
    },
    entityId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        field: 'entity_id',
    },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'notifications',
    modelName: 'Notification',
    underscored: true,
});
