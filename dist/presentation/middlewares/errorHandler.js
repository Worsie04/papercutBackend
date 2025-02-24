"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
class AppError extends Error {
    constructor(statusCode, message, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json(Object.assign({ status: 'error', message: err.message }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
    }
    // Log unexpected errors
    console.error('Unexpected error:', err);
    // Send generic error response
    return res.status(500).json(Object.assign({ status: 'error', message: 'Internal server error' }, (process.env.NODE_ENV === 'development' && { stack: err.stack })));
};
exports.errorHandler = errorHandler;
