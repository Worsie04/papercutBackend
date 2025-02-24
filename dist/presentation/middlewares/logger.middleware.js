"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.errorLogger = exports.requestLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const config_1 = require("../../config");
// Create Winston logger
const logger = winston_1.default.createLogger({
    level: config_1.config.nodeEnv === 'development' ? 'debug' : 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json()),
    transports: [
        // Write all logs to console
        new winston_1.default.transports.Console({
            format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
        }),
        // Write all logs with level 'info' and below to combined.log
        new winston_1.default.transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Write all errors to error.log
        new winston_1.default.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});
exports.logger = logger;
// Request logging middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    // Log request
    logger.info({
        type: 'request',
        method: req.method,
        url: req.url,
        query: req.query,
        body: req.method === 'POST' || req.method === 'PUT' ? '(omitted)' : undefined,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    // Log response
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info({
            type: 'response',
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
        });
    });
    next();
};
exports.requestLogger = requestLogger;
// Error logging middleware
const errorLogger = (error, req, res, next) => {
    logger.error({
        type: 'error',
        method: req.method,
        url: req.url,
        status: error.status || 500,
        message: error.message,
        stack: config_1.config.nodeEnv === 'development' ? error.stack : undefined,
    });
    next(error);
};
exports.errorLogger = errorLogger;
