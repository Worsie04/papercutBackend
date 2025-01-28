"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireActive = exports.requireVerifiedEmail = exports.requireAdmin = exports.authenticate = void 0;
const jwt_util_1 = require("../../utils/jwt.util");
const errorHandler_1 = require("./errorHandler");
const admin_model_1 = require("../../models/admin.model");
const user_model_1 = require("../../models/user.model");
const authenticate = (type) => {
    return async (req, res, next) => {
        var _a, _b, _c;
        try {
            // Check for token in cookies or Authorization header
            const token = ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.access_token_w) || ((_b = req.headers.authorization) === null || _b === void 0 ? void 0 : _b.split(' ')[1]);
            console.log('Cookie token:', (_c = req.cookies) === null || _c === void 0 ? void 0 : _c.access_token_w);
            console.log('Auth header:', req.headers.authorization);
            if (!token) {
                throw new errorHandler_1.AppError(401, 'No token provided');
            }
            console.log('Using token:', token);
            const decoded = jwt_util_1.JwtUtil.verifyToken(token);
            console.log('Decoded token:', decoded);
            if (type && decoded.type !== type) {
                throw new errorHandler_1.AppError(403, 'Unauthorized access');
            }
            req.user = decoded;
            next();
        }
        catch (error) {
            console.error('Auth error:', error);
            if (error instanceof errorHandler_1.AppError) {
                next(error);
            }
            else {
                next(new errorHandler_1.AppError(401, 'Invalid token'));
            }
        }
    };
};
exports.authenticate = authenticate;
const requireAdmin = (roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || req.user.type !== 'admin') {
                throw new errorHandler_1.AppError(403, 'Admin access required');
            }
            if (roles && roles.length > 0) {
                const admin = await admin_model_1.Admin.findByPk(req.user.id);
                if (!admin || !roles.includes(admin.role)) {
                    throw new errorHandler_1.AppError(403, 'Insufficient permissions');
                }
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requireAdmin = requireAdmin;
const requireVerifiedEmail = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errorHandler_1.AppError(401, 'Authentication required');
        }
        if (req.user.type === 'admin') {
            const admin = await admin_model_1.Admin.findByPk(req.user.id);
            if (!admin || !admin.emailVerifiedAt) {
                throw new errorHandler_1.AppError(403, 'Email verification required');
            }
        }
        else {
            const user = await user_model_1.User.findByPk(req.user.id);
            if (!user || !user.emailVerifiedAt) {
                throw new errorHandler_1.AppError(403, 'Email verification required');
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireVerifiedEmail = requireVerifiedEmail;
const requireActive = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new errorHandler_1.AppError(401, 'Authentication required');
        }
        if (req.user.type === 'admin') {
            const admin = await admin_model_1.Admin.findByPk(req.user.id);
            if (!admin || !admin.isActive) {
                throw new errorHandler_1.AppError(403, 'Account is deactivated');
            }
        }
        else {
            const user = await user_model_1.User.findByPk(req.user.id);
            if (!user || !user.isActive) {
                throw new errorHandler_1.AppError(403, 'Account is deactivated');
            }
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.requireActive = requireActive;
const requireAuth = async (req, res, next) => {
    var _a;
    try {
        // Check for token in cookies or Authorization header
        const token = req.cookies.access_token_w || ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1]);
        if (!token) {
            throw new errorHandler_1.AppError(401, 'Unauthorized');
        }
        const decoded = await jwt_util_1.JwtUtil.verifyToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        next(new errorHandler_1.AppError(401, 'Unauthorized'));
    }
};
exports.requireAuth = requireAuth;
