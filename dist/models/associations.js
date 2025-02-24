"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
function setupAssociations() {
    // Organization-User ownership associations
    organization_model_1.Organization.belongsTo(user_model_1.User, {
        foreignKey: 'owner_id',
        as: 'userOwner',
        constraints: false
    });
    user_model_1.User.hasMany(organization_model_1.Organization, {
        foreignKey: 'owner_id',
        as: 'ownedOrganizations',
        constraints: false
    });
    // Organization-Admin ownership associations
    organization_model_1.Organization.belongsTo(admin_model_1.Admin, {
        foreignKey: 'owner_id',
        as: 'adminOwner',
        constraints: false
    });
    admin_model_1.Admin.hasMany(organization_model_1.Organization, {
        foreignKey: 'owner_id',
        as: 'ownedOrganizations',
        constraints: false
    });
    // Organization-Member associations
    organization_model_1.Organization.hasMany(organization_member_model_1.OrganizationMember, {
        foreignKey: 'organization_id',
        as: 'organizationMembers'
    });
    organization_member_model_1.OrganizationMember.belongsTo(organization_model_1.Organization, {
        foreignKey: 'organization_id',
        as: 'organization'
    });
    user_model_1.User.hasMany(organization_member_model_1.OrganizationMember, {
        foreignKey: 'user_id',
        as: 'organizationMemberships'
    });
    organization_member_model_1.OrganizationMember.belongsTo(user_model_1.User, {
        foreignKey: 'user_id',
        as: 'user'
    });
    user_model_1.User.hasMany(organization_member_model_1.OrganizationMember, {
        foreignKey: 'invited_by',
        as: 'invitedMembers'
    });
    organization_member_model_1.OrganizationMember.belongsTo(user_model_1.User, {
        foreignKey: 'invited_by',
        as: 'inviter'
    });
    // User-Role associations
    user_model_1.User.belongsToMany(role_model_1.Role, {
        through: 'user_roles',
        foreignKey: 'userId',
        otherKey: 'roleId',
    });
    role_model_1.Role.belongsToMany(user_model_1.User, {
        through: 'user_roles',
        foreignKey: 'roleId',
        otherKey: 'userId',
    });
    // Space-User associations
    space_model_1.Space.belongsTo(user_model_1.User, {
        foreignKey: 'ownerId',
        as: 'owner',
    });
    user_model_1.User.hasMany(space_model_1.Space, {
        foreignKey: 'ownerId',
        as: 'ownedSpaces',
    });
    space_model_1.Space.belongsToMany(user_model_1.User, {
        through: space_member_model_1.SpaceMember,
        foreignKey: 'spaceId',
        otherKey: 'userId',
        as: 'spaceMembers',
    });
    user_model_1.User.belongsToMany(space_model_1.Space, {
        through: space_member_model_1.SpaceMember,
        foreignKey: 'userId',
        otherKey: 'spaceId',
        as: 'memberSpaces',
    });
    // Record Associations
    record_model_1.Record.belongsTo(cabinet_model_1.Cabinet, {
        foreignKey: 'cabinetId',
        as: 'cabinet'
    });
    record_model_1.Record.belongsTo(user_model_1.User, {
        foreignKey: 'creatorId',
        as: 'creator'
    });
    record_model_1.Record.belongsTo(user_model_1.User, {
        foreignKey: 'lastModifiedBy',
        as: 'modifier'
    });
    // Cabinet Associations
    cabinet_model_1.Cabinet.hasMany(record_model_1.Record, {
        foreignKey: 'cabinetId',
        as: 'records'
    });
    cabinet_model_1.Cabinet.belongsTo(space_model_1.Space, {
        foreignKey: 'spaceId',
        as: 'space'
    });
    cabinet_model_1.Cabinet.belongsTo(cabinet_model_1.Cabinet, {
        foreignKey: 'parentId',
        as: 'parent'
    });
    cabinet_model_1.Cabinet.belongsTo(user_model_1.User, {
        foreignKey: 'createdById',
        as: 'createdBy'
    });
    // Space Associations
    space_model_1.Space.hasMany(cabinet_model_1.Cabinet, {
        foreignKey: 'spaceId',
        as: 'cabinets'
    });
    space_model_1.Space.belongsTo(user_model_1.User, {
        foreignKey: 'createdById',
        as: 'createdBy'
    });
}
