"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Organization = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const user_model_1 = require("./user.model");
const admin_model_1 = require("./admin.model");
const organization_member_model_1 = require("./organization-member.model");
class Organization extends sequelize_1.Model {
    // Helper method to get the appropriate owner
    getOwner() {
        if (this.owner_type === 'user' && this.organizationOwner) {
            return this.organizationOwner;
        }
        else if (this.owner_type === 'admin' && this.adminOwner) {
            return this.adminOwner;
        }
        return undefined;
    }
    // Helper method to check if a user is a member
    async isMember(userId) {
        const member = await organization_member_model_1.OrganizationMember.findOne({
            where: {
                organizationId: this.id,
                userId,
                status: 'active'
            }
        });
        return !!member;
    }
    // Helper method to get a member's role
    async getMemberRole(userId) {
        const member = await organization_member_model_1.OrganizationMember.findOne({
            where: {
                organizationId: this.id,
                userId,
                status: 'active'
            }
        });
        return member ? member.role : null;
    }
    // Helper method to check if a user has a specific permission
    async hasPermission(userId, permission) {
        const member = await organization_member_model_1.OrganizationMember.findOne({
            where: {
                organizationId: this.id,
                userId,
                status: 'active'
            }
        });
        return member ? member.hasPermission(permission) : false;
    }
}
exports.Organization = Organization;
Organization.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    type: {
        type: sequelize_1.DataTypes.ENUM('Personal', 'Corporate'),
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    logo: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    subscription: {
        type: sequelize_1.DataTypes.ENUM('Free', 'Pro', 'Enterprise'),
        allowNull: false,
        defaultValue: 'Free',
    },
    visibility: {
        type: sequelize_1.DataTypes.ENUM('Public', 'Private'),
        allowNull: false,
        defaultValue: 'Private',
    },
    domain: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            is: /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/i,
        },
    },
    owner_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    owner_type: {
        type: sequelize_1.DataTypes.ENUM('user', 'admin'),
        allowNull: false,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'created_at',
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        field: 'updated_at',
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Organization',
    tableName: 'organizations',
    underscored: true,
    timestamps: true,
    scopes: {
        withUserOwner: {
            include: [{
                    model: user_model_1.User,
                    as: 'organizationOwner',
                    required: false,
                    where: {
                        '$Organization.owner_type$': 'user'
                    }
                }]
        },
        withAdminOwner: {
            include: [{
                    model: admin_model_1.Admin,
                    as: 'adminOwner',
                    required: false,
                    where: {
                        '$Organization.owner_type$': 'admin'
                    }
                }]
        },
        withMembers: {
            include: [{
                    model: organization_member_model_1.OrganizationMember,
                    as: 'members',
                    include: [{
                            model: user_model_1.User,
                            as: 'user'
                        }]
                }]
        }
    }
});
