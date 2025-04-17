"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = require("../infrastructure/database/sequelize");
class File extends sequelize_1.Model {
}
File.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    originalName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    path: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    size: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    isAllocated: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: false,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
}, {
    tableName: 'files',
    sequelize: sequelize_2.sequelize,
    timestamps: true,
});
exports.default = File;
