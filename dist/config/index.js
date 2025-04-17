"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Make sure we have a secret defined
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret && process.env.NODE_ENV === 'production') {
    console.error('WARNING: JWT_SECRET environment variable not set in production environment!');
}
exports.config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '4000', 10), //4000 idi
    // Database
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        name: process.env.DB_NAME || 'latest_worsie',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
    },
    // JWT
    jwt: {
        secret: jwtSecret || 'development-only-secret-key-do-not-use-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    },
    // CORS
    corsOrigins: ((_a = process.env.CORS_ORIGINS) === null || _a === void 0 ? void 0 : _a.split(',')) || ['http://localhost:3000'],
    // Azure
    azure: {
        storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
        containerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'worsie-files',
    },
    // Email
    email: {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: process.env.EMAIL_SECURE === 'true',
        user: process.env.EMAIL_USER || '',
        password: process.env.EMAIL_PASSWORD || '',
        fromName: process.env.EMAIL_FROM_NAME || 'Worsie',
        fromAddress: process.env.EMAIL_FROM_ADDRESS || 'noreply@worsie.com',
    },
    // Client URL
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    // Session
    session: {
        secret: process.env.SESSION_SECRET || 'your-session-secret',
        maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000', 10), // 24 hours
    },
    // Security
    security: {
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '9000000', 10), // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    },
};
