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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDatabase = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const config_1 = require("../../config");
// Create Sequelize instance
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
// Function to initialize database connection and setup
const initializeDatabase = async () => {
    try {
        // Test the connection first
        await exports.sequelize.authenticate();
        console.log('Database connection has been established successfully.');
        // Import and initialize models
        const { initializeModels } = await Promise.resolve().then(() => __importStar(require('../../models')));
        const models = initializeModels(exports.sequelize);
        // Import and setup associations after models are initialized
        const { setupAssociations } = await Promise.resolve().then(() => __importStar(require('../../models/associations')));
        await setupAssociations();
        // Sync models with database (in development only)
        if (config_1.config.nodeEnv === 'production') {
            await exports.sequelize.sync({ alter: true });
            console.log('Database models synchronized successfully.');
        }
        return models;
    }
    catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
