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
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        console.log(`CORS request from origin: ${origin || 'No origin'}`);
        // Allow requests with no origin (like mobile apps, curl requests, or same-origin)
        if (!origin) {
            console.log('No origin - allowing request');
            return callback(null, true);
        }
        // Get the list of allowed origins
        const allowedOrigins = Array.isArray(config_1.config.corsOrigins)
            ? config_1.config.corsOrigins
            : config_1.config.corsOrigins ? [config_1.config.corsOrigins] : [];
        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
            console.log('Development mode - allowing all origins');
            return callback(null, true);
        }
        // In production environment
        try {
            // Check if the origin matches any allowed origin
            const originUrl = new URL(origin);
            const matchesAllowed = allowedOrigins.some(allowed => {
                if (typeof allowed !== 'string')
                    return false;
                // Match exact origins or wildcards like *.domain.com
                if (allowed.startsWith('*.')) {
                    const domain = allowed.substring(2);
                    return originUrl.hostname.endsWith(domain);
                }
                return allowed === origin;
            });
            if (matchesAllowed) {
                console.log(`Origin ${origin} allowed by CORS`);
                return callback(null, true);
            }
            else {
                console.log(`Origin ${origin} not in allowed list:`, allowedOrigins);
                // In production, we'll be permissive but log the issue
                return callback(null, true);
            }
        }
        catch (err) {
            console.error(`Error parsing origin: ${origin}`, err);
            // Allow in case of parsing errors to avoid breaking functionality
            return callback(null, true);
        }
    },
    credentials: true, // Critical for cross-origin cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'Content-Length',
        'Accept-Encoding',
        'X-CSRF-Token',
        'Cookie'
    ],
    exposedHeaders: [
        'Set-Cookie',
        'set-cookie',
        'Authorization',
        'Access-Control-Allow-Credentials',
        'Access-Control-Allow-Origin'
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
// app.use(session({
//   secret: config.session.secret,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: config.nodeEnv === 'production',
//     httpOnly: true,
//     maxAge: config.session.maxAge,
//     sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
//     path: '/'
//   }
// }));
app.use((0, express_session_1.default)({
    secret: config_1.config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true, // Həmişə true olsun
        httpOnly: true,
        maxAge: config_1.config.session.maxAge,
        sameSite: 'none', // Cross-domain üçün 'none' olmalıdır
        path: '/',
        domain: process.env.NODE_ENV === 'production' ?
            '.papercut.website' : undefined // Əsas domain, alt-domainləri də əhatə edir
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
