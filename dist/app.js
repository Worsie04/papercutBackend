"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.initializeApp = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_session_1 = __importDefault(require("express-session"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const config_1 = require("./config");
const errorHandler_1 = require("./presentation/middlewares/errorHandler");
const logger_middleware_1 = require("./presentation/middlewares/logger.middleware");
const routes_1 = __importDefault(require("./presentation/routes"));
const sequelize_1 = require("./infrastructure/database/sequelize");
const app = (0, express_1.default)();
exports.app = app;
// Initialize database and models before starting the server
let isInitialized = false;
const initializeApp = async () => {
    if (!isInitialized) {
        try {
            await (0, sequelize_1.initializeDatabase)();
            isInitialized = true;
        }
        catch (error) {
            console.error('Failed to initialize database:', error);
            process.exit(1);
        }
    }
};
exports.initializeApp = initializeApp;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: config_1.config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'Content-Length',
        'Accept-Encoding',
        'X-CSRF-Token'
    ]
}));
// Cookie parser middleware
app.use((0, cookie_parser_1.default)());
// Global rate limiting to prevent abuse
// const limiter = rateLimit({
//   windowMs: config.security.rateLimitWindowMs,
//   max: config.security.rateLimitMax,
//   message: 'Too many requests from this IP, please try again later'
// });
// app.use(limiter);
// Session middleware
app.use((0, express_session_1.default)({
    secret: config_1.config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config_1.config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: config_1.config.session.maxAge,
        sameSite: 'strict',
    }
}));
// Logging middleware
app.use(logger_middleware_1.requestLogger);
// Body parsing middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Mount routes
app.use(routes_1.default);
app.set('trust proxy', 1); // Proxy arxasında işləmək üçün
// Error logging
app.use(logger_middleware_1.errorLogger);
// Error handling
app.use(errorHandler_1.errorHandler);
