"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAssociations = void 0;
exports.setupAssociations = setupAssociations;
const user_model_1 = require("./user.model");
const role_model_1 = require("./role.model");
const space_model_1 = require("./space.model");
const space_member_model_1 = require("./space-member.model");
const record_model_1 = require("./record.model");
const cabinet_model_1 = require("./cabinet.model");
const organization_model_1 = require("./organization.model");
const admin_model_1 = require("./admin.model");
const organization_member_model_1 = require("./organization-member.model");
const cabinet_member_model_1 = require("./cabinet-member.model");
const cabinet_member_permission_model_1 = require("./cabinet-member-permission.model");
const file_model_1 = __importDefault(require("./file.model"));
const record_file_model_1 = __importDefault(require("./record-file.model"));
const notification_model_1 = require("./notification.model");
const chat_message_model_1 = __importDefault(require("./chat-message.model"));
const group_model_1 = require("./group.model");
const cabinet_reassignment_model_1 = require("./cabinet-reassignment.model");
const template_share_model_1 = __importDefault(require("./template-share.model"));
const template_model_1 = __importDefault(require("./template.model"));
function setupAssociations() {
    // Notification-User associations
    notification_model_1.Notification.belongsTo(user_model_1.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(notification_model_1.Notification, {
        foreignKey: 'userId',
        as: 'notifications',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Organization-User ownership associations
    organization_model_1.Organization.belongsTo(user_model_1.User, {
        foreignKey: 'owner_id',
        as: 'organizationOwner',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(organization_model_1.Organization, {
        foreignKey: 'owner_id',
        as: 'ownedOrganizations',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Organization-Admin ownership associations
    organization_model_1.Organization.belongsTo(admin_model_1.Admin, {
        foreignKey: 'owner_id',
        as: 'adminOwner',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    admin_model_1.Admin.hasMany(organization_model_1.Organization, {
        foreignKey: 'owner_id',
        as: 'ownedAdminOrganizations',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Organization-Member associations
    organization_model_1.Organization.hasMany(organization_member_model_1.OrganizationMember, {
        foreignKey: 'organization_id',
        as: 'members',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    organization_member_model_1.OrganizationMember.belongsTo(organization_model_1.Organization, {
        foreignKey: 'organization_id',
        as: 'organization',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(organization_member_model_1.OrganizationMember, {
        foreignKey: 'user_id',
        as: 'organizationMemberships',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    organization_member_model_1.OrganizationMember.belongsTo(user_model_1.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(organization_member_model_1.OrganizationMember, {
        foreignKey: 'invited_by',
        as: 'invitedMembers',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    organization_member_model_1.OrganizationMember.belongsTo(user_model_1.User, {
        foreignKey: 'invited_by',
        as: 'inviter',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    // User-Role associations
    user_model_1.User.belongsToMany(role_model_1.Role, {
        through: 'user_roles',
        foreignKey: 'user_id',
        otherKey: 'role_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    role_model_1.Role.belongsToMany(user_model_1.User, {
        through: 'user_roles',
        foreignKey: 'role_id',
        otherKey: 'user_id',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Space-User associations
    space_model_1.Space.belongsTo(user_model_1.User, {
        foreignKey: 'owner_id',
        as: 'owner',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(space_model_1.Space, {
        foreignKey: 'owner_id',
        as: 'ownedSpaces',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    space_model_1.Space.belongsToMany(user_model_1.User, {
        through: space_member_model_1.SpaceMember,
        foreignKey: 'space_id',
        otherKey: 'user_id',
        as: 'members',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.belongsToMany(space_model_1.Space, {
        through: space_member_model_1.SpaceMember,
        foreignKey: 'user_id',
        otherKey: 'space_id',
        as: 'spaces',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Space-Creator association
    space_model_1.Space.belongsTo(user_model_1.User, {
        foreignKey: 'created_by_id',
        as: 'creator',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(space_model_1.Space, {
        foreignKey: 'created_by_id',
        as: 'createdSpaces',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Space-Rejector association
    space_model_1.Space.belongsTo(user_model_1.User, {
        foreignKey: 'rejected_by',
        as: 'rejector',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(space_model_1.Space, {
        foreignKey: 'rejected_by',
        as: 'rejectedSpaces',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    // Cabinet associations
    cabinet_model_1.Cabinet.belongsTo(space_model_1.Space, {
        foreignKey: 'space_id',
        as: 'space',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    space_model_1.Space.hasMany(cabinet_model_1.Cabinet, {
        foreignKey: 'space_id',
        as: 'cabinets',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_model_1.Cabinet.belongsTo(cabinet_model_1.Cabinet, {
        foreignKey: 'parent_id',
        as: 'parent',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_model_1.Cabinet.hasMany(cabinet_model_1.Cabinet, {
        foreignKey: 'parent_id',
        as: 'children',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Cabinet-User associations
    cabinet_model_1.Cabinet.belongsTo(user_model_1.User, {
        foreignKey: 'created_by_id',
        as: 'creator',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(cabinet_model_1.Cabinet, {
        foreignKey: 'created_by_id',
        as: 'createdCabinets',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_model_1.Cabinet.belongsToMany(user_model_1.User, {
        through: cabinet_member_model_1.CabinetMember,
        foreignKey: 'cabinet_id',
        otherKey: 'user_id',
        as: 'members',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.belongsToMany(cabinet_model_1.Cabinet, {
        through: cabinet_member_model_1.CabinetMember,
        foreignKey: 'user_id',
        otherKey: 'cabinet_id',
        as: 'memberCabinets',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Record associations
    record_model_1.Record.belongsTo(cabinet_model_1.Cabinet, {
        foreignKey: 'cabinet_id',
        as: 'cabinet',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_model_1.Cabinet.hasMany(record_model_1.Record, {
        foreignKey: 'cabinet_id',
        as: 'records',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    record_model_1.Record.belongsTo(user_model_1.User, {
        foreignKey: 'creator_id',
        as: 'creator',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(record_model_1.Record, {
        foreignKey: 'creator_id',
        as: 'createdRecords',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    record_model_1.Record.belongsTo(user_model_1.User, {
        foreignKey: 'last_modified_by',
        as: 'modifier',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(record_model_1.Record, {
        foreignKey: 'last_modified_by',
        as: 'modifiedRecords',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
    });
    // Cabinet Member associations
    cabinet_model_1.Cabinet.hasMany(cabinet_member_model_1.CabinetMember, {
        foreignKey: 'cabinet_id',
        as: 'cabinetMembers',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_member_model_1.CabinetMember.belongsTo(cabinet_model_1.Cabinet, {
        foreignKey: 'cabinet_id',
        as: 'cabinet',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(cabinet_member_model_1.CabinetMember, {
        foreignKey: 'user_id',
        as: 'cabinetMemberships',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_member_model_1.CabinetMember.belongsTo(user_model_1.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Cabinet Member Permission associations
    cabinet_member_model_1.CabinetMember.hasOne(cabinet_member_permission_model_1.CabinetMemberPermission, {
        foreignKey: 'cabinet_member_id',
        as: 'memberPermissions',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_member_permission_model_1.CabinetMemberPermission.belongsTo(cabinet_member_model_1.CabinetMember, {
        foreignKey: 'cabinet_member_id',
        as: 'cabinetMember',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_member_permission_model_1.CabinetMemberPermission.belongsTo(user_model_1.User, {
        foreignKey: 'user_id',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    cabinet_member_permission_model_1.CabinetMemberPermission.belongsTo(cabinet_model_1.Cabinet, {
        foreignKey: 'cabinet_id',
        as: 'cabinet',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Record and File associations
    record_model_1.Record.belongsToMany(file_model_1.default, {
        through: record_file_model_1.default,
        foreignKey: 'record_id',
        otherKey: 'file_id',
        as: 'files',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    file_model_1.default.belongsToMany(record_model_1.Record, {
        through: record_file_model_1.default,
        foreignKey: 'file_id',
        otherKey: 'record_id',
        as: 'records',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // File-User associations
    file_model_1.default.belongsTo(user_model_1.User, {
        foreignKey: 'user_id',
        as: 'owner',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(file_model_1.default, {
        foreignKey: 'user_id',
        as: 'files',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // Chat message associations
    chat_message_model_1.default.belongsTo(record_model_1.Record, {
        foreignKey: 'recordId',
        as: 'record',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    record_model_1.Record.hasMany(chat_message_model_1.default, {
        foreignKey: 'recordId',
        as: 'chatMessages',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    chat_message_model_1.default.belongsTo(user_model_1.User, {
        foreignKey: 'userId',
        as: 'user',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    user_model_1.User.hasMany(chat_message_model_1.default, {
        foreignKey: 'userId',
        as: 'chatMessages',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
    });
    // User-Group associations
    user_model_1.User.belongsToMany(group_model_1.Group, {
        through: 'group_members',
        foreignKey: 'user_id',
        otherKey: 'group_id',
        as: 'groups'
    });
    group_model_1.Group.belongsToMany(user_model_1.User, {
        through: 'group_members',
        foreignKey: 'group_id',
        otherKey: 'user_id',
        as: 'members'
    });
    group_model_1.Group.belongsTo(user_model_1.User, {
        foreignKey: 'created_by',
        as: 'creator'
    });
    cabinet_model_1.Cabinet.hasMany(cabinet_reassignment_model_1.CabinetReassignment, {
        foreignKey: 'cabinetId',
        as: 'reassignments'
    });
    cabinet_reassignment_model_1.CabinetReassignment.belongsTo(cabinet_model_1.Cabinet, {
        foreignKey: 'cabinetId',
        as: 'cabinet'
    });
    cabinet_reassignment_model_1.CabinetReassignment.belongsTo(user_model_1.User, {
        foreignKey: 'fromUserId',
        as: 'fromUser',
    });
    cabinet_reassignment_model_1.CabinetReassignment.belongsTo(user_model_1.User, {
        foreignKey: 'toUserId',
        as: 'toUser',
    });
    template_share_model_1.default.belongsTo(user_model_1.User, {
        foreignKey: 'sharedByUserId',
        targetKey: 'id',
        as: 'sharedByUser'
    });
    template_share_model_1.default.belongsTo(user_model_1.User, {
        foreignKey: 'sharedWithUserId',
        targetKey: 'id',
        as: 'sharedWithUser'
    });
    // Define the relationship to the Template
    template_share_model_1.default.belongsTo(template_model_1.default, {
        foreignKey: 'templateId',
        targetKey: 'id',
        as: 'template'
    });
    user_model_1.User.hasMany(template_share_model_1.default, {
        sourceKey: 'id',
        foreignKey: 'sharedByUserId',
        as: 'initiatedShares'
    });
    user_model_1.User.hasMany(template_share_model_1.default, {
        sourceKey: 'id',
        foreignKey: 'sharedWithUserId',
        as: 'receivedShares'
    });
    template_model_1.default.hasMany(template_share_model_1.default, {
        sourceKey: 'id',
        foreignKey: 'templateId',
        as: 'shares'
    });
    template_model_1.default.belongsTo(user_model_1.User, {
        foreignKey: 'userId',
        targetKey: 'id',
        as: 'user'
    });
    user_model_1.User.hasMany(template_model_1.default, {
        sourceKey: 'id',
        foreignKey: 'userId',
        as: 'createdTemplates'
    });
}
// Export the function with both names for backward compatibility
exports.initializeAssociations = setupAssociations;
