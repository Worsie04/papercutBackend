"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceInvitation = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const space_model_1 = require("./space.model");
const user_model_1 = require("./user.model");
class SpaceInvitation extends sequelize_1.Model {
}
exports.SpaceInvitation = SpaceInvitation;
SpaceInvitation.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    spaceId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'spaces',
            key: 'id',
        },
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    role: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['member', 'co-owner', 'readonly']],
        },
    },
    inviterId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    expiresAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
        defaultValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from creation
    },
    acceptedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    createdAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    updatedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
}, {
    sequelize: sequelize_2.sequelize,
    tableName: 'space_invitations',
    modelName: 'SpaceInvitation',
});
// Define associations
SpaceInvitation.belongsTo(space_model_1.Space, {
    foreignKey: 'spaceId',
    as: 'space',
});
SpaceInvitation.belongsTo(user_model_1.User, {
    foreignKey: 'inviterId',
    as: 'inviter',
});
// Add hooks to automatically expire invitations
SpaceInvitation.beforeFind((options) => {
    // Update expired invitations
    const currentDate = new Date();
    SpaceInvitation.update({ status: 'expired' }, {
        where: {
            status: 'pending',
            expiresAt: {
                [sequelize_1.Op.lt]: currentDate,
            },
        },
    });
});
exports.default = SpaceInvitation;
