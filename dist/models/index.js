"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeModels = void 0;
const user_model_1 = require("./user.model");
const admin_model_1 = require("./admin.model");
const organization_model_1 = require("./organization.model");
const organization_member_model_1 = require("./organization-member.model");
const role_model_1 = require("./role.model");
const space_model_1 = require("./space.model");
const cabinet_model_1 = require("./cabinet.model");
const record_model_1 = require("./record.model");
const setting_model_1 = require("./setting.model");
const config_model_1 = require("./config.model");
const user_role_model_1 = require("./user-role.model");
const space_member_model_1 = require("./space-member.model");
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
        Record: record_model_1.Record,
        Setting: setting_model_1.Setting,
        Config: config_model_1.Config,
        UserRole: user_role_model_1.UserRole,
        SpaceMember: space_member_model_1.SpaceMember
    };
    return models;
};
exports.initializeModels = initializeModels;
