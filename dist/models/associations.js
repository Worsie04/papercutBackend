"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAssociations = setupAssociations;
exports.initializeAssociations = initializeAssociations;
const user_model_1 = require("./user.model");
const role_model_1 = require("./role.model");
const space_model_1 = require("./space.model");
const space_member_model_1 = require("./space-member.model");
const record_model_1 = require("./record.model");
const cabinet_model_1 = require("./cabinet.model");
function setupAssociations() {
    user_model_1.User.belongsToMany(role_model_1.Role, {
        through: 'user_roles',
        as: 'roles',
        foreignKey: 'userId'
    });
    role_model_1.Role.belongsToMany(user_model_1.User, {
        through: 'user_roles',
        as: 'users',
        foreignKey: 'roleId'
    });
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
        as: 'members',
    });
    user_model_1.User.belongsToMany(space_model_1.Space, {
        through: space_member_model_1.SpaceMember,
        foreignKey: 'userId',
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
function initializeAssociations() {
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
