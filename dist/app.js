"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeApp = exports.app = void 0;
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
/* ---------  1 TRUST THE RENDER PROXY *BEFORE* COOKIES -------- */
app.set('trust proxy', 1); // ← moved to the top
/* ---------  2 SECURITY MIDDLEWARES --------------------------- */
app.use((0, helmet_1.default)());
/* ---------  3 CORS  ------------------------------------------ */
const allowedOrigins = Array.isArray(config_1.config.corsOrigins)
    ? config_1.config.corsOrigins.map((o) => o.trim()).filter(Boolean)
    : (typeof config_1.config.corsOrigins === 'string'
        ? config_1.config.corsOrigins
        : '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'X-Requested-With',
        'Content-Length',
        'Accept-Encoding',
        'X-CSRF-Token',
    ],
}));
/* ---------  4 COOKIES & SESSION ------------------------------ */
app.use((0, cookie_parser_1.default)());
app.use((0, express_session_1.default)({
    secret: config_1.config.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: true, // always HTTPS on Render
        sameSite: 'none', // cross-site cookie
        domain: '.onrender.com', // any sub-domain (api., client.)
        maxAge: config_1.config.session.maxAge,
    },
}));
/* ---------  5 LOGGING & BODY PARSERS ------------------------- */
app.use(logger_middleware_1.requestLogger);
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
/* ---------  6 ROUTES & ERROR HANDLERS ------------------------ */
app.use(routes_1.default);
app.use(logger_middleware_1.errorLogger);
app.use(errorHandler_1.errorHandler);
/* database initialiser stays unchanged ----------------------- */
let isInitialized = false;
const initializeApp = async () => {
    if (!isInitialized) {
        await (0, sequelize_1.initializeDatabase)();
        isInitialized = true;
    }
};
exports.initializeApp = initializeApp;
