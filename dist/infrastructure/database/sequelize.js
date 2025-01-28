"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const config_1 = require("../../config");
exports.sequelize = new sequelize_1.Sequelize({
    dialect: 'postgres',
    host: config_1.config.database.host,
    port: config_1.config.database.port,
    database: config_1.config.database.name,
    username: config_1.config.database.user,
    password: config_1.config.database.password,
    logging: config_1.config.nodeEnv === 'development' ? console.log : false,
    define: {
        timestamps: true,
        underscored: true,
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});
