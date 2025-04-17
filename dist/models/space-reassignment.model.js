"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpaceReassignment = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
class SpaceReassignment extends sequelize_1.Model {
}
exports.SpaceReassignment = SpaceReassignment;
SpaceReassignment.init({
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
        field: 'space_id',
    },
    fromUserId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'from_user_id',
    },
    toUserId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        field: 'to_user_id',
    },
    message: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
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
    tableName: 'space_reassignments',
    modelName: 'SpaceReassignment',
    underscored: true,
    timestamps: true,
});
