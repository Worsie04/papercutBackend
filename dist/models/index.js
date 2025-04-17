"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Activity = exports.RecordFile = exports.File = exports.SpaceReassignment = exports.SpaceCommentReject = exports.SpaceMember = exports.UserRole = exports.Config = exports.Setting = exports.Record = exports.CabinetMemberPermission = exports.CabinetMember = exports.Cabinet = exports.Space = exports.Role = exports.OrganizationMember = exports.Organization = exports.Admin = exports.User = exports.initializeModels = void 0;
const user_model_1 = require("./user.model");
Object.defineProperty(exports, "User", { enumerable: true, get: function () { return user_model_1.User; } });
const admin_model_1 = require("./admin.model");
Object.defineProperty(exports, "Admin", { enumerable: true, get: function () { return admin_model_1.Admin; } });
const organization_model_1 = require("./organization.model");
Object.defineProperty(exports, "Organization", { enumerable: true, get: function () { return organization_model_1.Organization; } });
const organization_member_model_1 = require("./organization-member.model");
Object.defineProperty(exports, "OrganizationMember", { enumerable: true, get: function () { return organization_member_model_1.OrganizationMember; } });
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
const space_comment_reject_model_1 = require("./space-comment-reject.model");
Object.defineProperty(exports, "SpaceCommentReject", { enumerable: true, get: function () { return space_comment_reject_model_1.SpaceCommentReject; } });
const space_reassignment_model_1 = require("./space-reassignment.model");
Object.defineProperty(exports, "SpaceReassignment", { enumerable: true, get: function () { return space_reassignment_model_1.SpaceReassignment; } });
const cabinet_member_model_1 = require("./cabinet-member.model");
Object.defineProperty(exports, "CabinetMember", { enumerable: true, get: function () { return cabinet_member_model_1.CabinetMember; } });
const cabinet_member_permission_model_1 = require("./cabinet-member-permission.model");
Object.defineProperty(exports, "CabinetMemberPermission", { enumerable: true, get: function () { return cabinet_member_permission_model_1.CabinetMemberPermission; } });
const file_model_1 = __importDefault(require("./file.model"));
exports.File = file_model_1.default;
const record_file_model_1 = __importDefault(require("./record-file.model"));
exports.RecordFile = record_file_model_1.default;
const activity_model_1 = require("./activity.model");
Object.defineProperty(exports, "Activity", { enumerable: true, get: function () { return activity_model_1.Activity; } });
const initializeModels = (sequelize) => {
    // Initialize all models first
    const models = {
        User: user_model_1.User,
        Admin: admin_model_1.Admin,
        Organization: organization_model_1.Organization,
        OrganizationMember: organization_member_model_1.OrganizationMember,
        Role: role_model_1.Role,
        Space: space_model_1.Space,
        Cabinet: cabinet_model_1.Cabinet,
        CabinetMember: cabinet_member_model_1.CabinetMember,
        CabinetMemberPermission: cabinet_member_permission_model_1.CabinetMemberPermission,
        Record: record_model_1.Record,
        Setting: setting_model_1.Setting,
        Config: config_model_1.Config,
        UserRole: user_role_model_1.UserRole,
        SpaceMember: space_member_model_1.SpaceMember,
        SpaceCommentReject: space_comment_reject_model_1.SpaceCommentReject,
        SpaceReassignment: space_reassignment_model_1.SpaceReassignment,
        File: file_model_1.default,
        RecordFile: record_file_model_1.default,
        Activity: activity_model_1.Activity
    };
    return models;
};
exports.initializeModels = initializeModels;
__exportStar(require("./cabinet.model"), exports);
__exportStar(require("./cabinet-member.model"), exports);
__exportStar(require("./cabinet-member-permission.model"), exports);
