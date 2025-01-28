"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceMember = exports.UserRole = exports.Config = exports.Setting = exports.Record = exports.Cabinet = exports.Space = exports.Role = exports.User = void 0;
const user_model_1 = require("./user.model");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return user_model_1.User; } });
const role_model_1 = require("./role.model");
Object.defineProperty(exports, "Role", { enumerable: true, get: function () { return role_model_1.Role; } });
const space_model_1 = require("./space.model");
Object.defineProperty(exports, "Space", { enumerable: true, get: function () { return space_model_1.Space; } });
const cabinet_model_1 = require("./cabinet.model");
Object.defineProperty(exports, "Cabinet", { enumerable: true, get: function () { return cabinet_model_1.Cabinet; } });
const record_model_1 = require("./record.model");
Object.defineProperty(exports, "Record", { enumerable: true, get: function () { return record_model_1.Record; } });
const setting_model_1 = require("./setting.model");
Object.defineProperty(exports, "Setting", { enumerable: true, get: function () { return setting_model_1.Setting; } });
const config_model_1 = require("./config.model");
Object.defineProperty(exports, "Config", { enumerable: true, get: function () { return config_model_1.Config; } });
const user_role_model_1 = require("./user-role.model");
Object.defineProperty(exports, "UserRole", { enumerable: true, get: function () { return user_role_model_1.UserRole; } });
const space_member_model_1 = require("./space-member.model");
Object.defineProperty(exports, "SpaceMember", { enumerable: true, get: function () { return space_member_model_1.SpaceMember; } });
const associations_1 = require("./associations");
// Set up associations
user_model_1.User.belongsToMany(role_model_1.Role, {
    through: user_role_model_1.UserRole,
    foreignKey: 'userId',
    otherKey: 'roleId',
    as: 'roles'
});
role_model_1.Role.belongsToMany(user_model_1.User, {
    through: user_role_model_1.UserRole,
    foreignKey: 'roleId',
    otherKey: 'userId',
    as: 'users'
});
// Space-User relationships
space_model_1.Space.belongsTo(user_model_1.User, {
    foreignKey: 'ownerId',
    as: 'owner',
});
user_model_1.User.hasMany(space_model_1.Space, {
    foreignKey: 'ownerId',
    as: 'ownedSpaces',
});
// Space-User Many-to-Many for members
space_model_1.Space.belongsToMany(user_model_1.User, {
    through: 'space_members',
    foreignKey: 'spaceId',
    otherKey: 'userId',
    as: 'members',
});
user_model_1.User.belongsToMany(space_model_1.Space, {
    through: 'space_members',
    foreignKey: 'userId',
    otherKey: 'spaceId',
    as: 'memberSpaces',
});
// Cabinet relationships
cabinet_model_1.Cabinet.belongsTo(space_model_1.Space, {
    foreignKey: 'spaceId',
    as: 'space',
});
// Add createdBy association for Cabinet
cabinet_model_1.Cabinet.belongsTo(user_model_1.User, {
    foreignKey: 'createdById',
    as: 'createdBy',
});
user_model_1.User.hasMany(cabinet_model_1.Cabinet, {
    foreignKey: 'createdById',
    as: 'createdCabinets',
});
space_model_1.Space.hasMany(cabinet_model_1.Cabinet, {
    foreignKey: 'spaceId',
    as: 'cabinets',
});
// Cabinet self-referential relationship for hierarchy
cabinet_model_1.Cabinet.belongsTo(cabinet_model_1.Cabinet, {
    foreignKey: 'parentId',
    as: 'parent',
});
cabinet_model_1.Cabinet.hasMany(cabinet_model_1.Cabinet, {
    foreignKey: 'parentId',
    as: 'children',
});
// Record relationships
record_model_1.Record.belongsTo(cabinet_model_1.Cabinet, {
    foreignKey: 'cabinetId',
    as: 'cabinet',
});
cabinet_model_1.Cabinet.hasMany(record_model_1.Record, {
    foreignKey: 'cabinetId',
    as: 'records',
});
record_model_1.Record.belongsTo(user_model_1.User, {
    foreignKey: 'creatorId',
    as: 'creator',
});
record_model_1.Record.belongsTo(user_model_1.User, {
    foreignKey: 'lastModifiedBy',
    as: 'modifier',
});
user_model_1.User.hasMany(record_model_1.Record, {
    foreignKey: 'creatorId',
    as: 'createdRecords',
});
user_model_1.User.hasMany(record_model_1.Record, {
    foreignKey: 'lastModifiedBy',
    as: 'modifiedRecords',
});
// Setting relationships
setting_model_1.Setting.belongsTo(user_model_1.User, {
    foreignKey: 'lastModifiedBy',
    as: 'modifier',
});
user_model_1.User.hasMany(setting_model_1.Setting, {
    foreignKey: 'lastModifiedBy',
    as: 'modifiedSettings',
});
// Config relationships
config_model_1.Config.belongsTo(user_model_1.User, {
    foreignKey: 'lastModifiedBy',
    as: 'modifier',
});
user_model_1.User.hasMany(config_model_1.Config, {
    foreignKey: 'lastModifiedBy',
    as: 'modifiedConfigs',
});
(0, associations_1.setupAssociations)();
