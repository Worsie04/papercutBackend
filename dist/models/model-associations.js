"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAssociations = void 0;
const organization_model_1 = require("./organization.model");
const user_model_1 = require("./user.model");
const organization_member_model_1 = require("./organization-member.model");
const setupAssociations = () => {
    // Set up associations for OrganizationMember
    organization_member_model_1.OrganizationMember.belongsTo(user_model_1.User, {
        foreignKey: 'userId',
        as: 'user'
    });
    organization_member_model_1.OrganizationMember.belongsTo(organization_model_1.Organization, {
        foreignKey: 'organizationId',
        as: 'organization'
    });
    organization_member_model_1.OrganizationMember.belongsTo(user_model_1.User, {
        foreignKey: 'invitedBy',
        as: 'inviter'
    });
    organization_model_1.Organization.hasMany(organization_member_model_1.OrganizationMember, {
        foreignKey: 'organizationId',
        as: 'members'
    });
    user_model_1.User.hasMany(organization_member_model_1.OrganizationMember, {
        foreignKey: 'userId',
        as: 'organizationMemberships'
    });
};
exports.setupAssociations = setupAssociations;
