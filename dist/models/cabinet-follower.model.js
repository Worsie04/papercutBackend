"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CabinetFollower = void 0;
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
const user_model_1 = require("./user.model");
const cabinet_model_1 = require("./cabinet.model");
class CabinetFollower extends sequelize_1.Model {
}
exports.CabinetFollower = CabinetFollower;
CabinetFollower.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    user_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    cabinet_id: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'cabinets',
            key: 'id',
        },
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'cabinet_follower',
    tableName: 'cabinet_followers',
    timestamps: true,
    underscored: true,
});
// Define associations
CabinetFollower.belongsTo(user_model_1.User, {
    foreignKey: 'user_id',
    as: 'user',
});
CabinetFollower.belongsTo(cabinet_model_1.Cabinet, {
    foreignKey: 'cabinet_id',
    as: 'cabinet',
});
exports.default = CabinetFollower;
