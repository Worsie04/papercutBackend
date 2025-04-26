"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireActive = exports.requireVerifiedEmail = exports.requireAdmin = exports.authenticate = void 0;
const jwt_util_1 = require("../../utils/jwt.util");
const errorHandler_1 = require("./errorHandler");
const admin_model_1 = require("../../models/admin.model");
const user_model_1 = require("../../models/user.model");
// In auth.middleware.ts
const authenticate = (type) => {
    return async (req, res, next) => {
        var _a;
        try {
            let token;
            // Check Authorization header
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
            if (!token) {
                token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.access_token_w;
            }
            // if (!token) {
            //   throw new AppError(401, 'No token provided');
            // }
            // Validate token format before verification
            if (typeof token !== 'string' || token.trim() === '') {
                throw new errorHandler_1.AppError(401, 'Invalid token format');
            }
            try {
                const decoded = await jwt_util_1.JwtUtil.verifyToken(token.trim());
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    type: decoded.type,
                    role: decoded.role
                };
                next();
            }
            catch (error) {
                throw new errorHandler_1.AppError(401, 'Invalid or expired token');
            }
        }
        catch (error) {
            next(error);
        }
    };
};
exports.authenticate = authenticate;
const requireAdmin = (roles) => {
    return async (req, res, next) => {
        try {
            console.log('Checking admin access...', req.user);
            // if (!req.user || (req.user.type !== 'admin' && req.user.role !== 'super_admin')) {
            //   throw new AppError(403, 'Admin access required');
            // }
            // if (roles && roles.length > 0) {
            //   const admin = await Admin.findByPk(req.user.id);
            //   if (!admin || !roles.includes(admin.role as AdminRole)) {
            //     throw new AppError(403, 'You do not have the required permissions for this action');
            //   }
            // }
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
                throw new errorHandler_1.AppError(403, 'Please verify your email address before continuing');
            }
        }
        else {
            const user = await user_model_1.User.findByPk(req.user.id);
            if (!user || !user.emailVerifiedAt) {
                throw new errorHandler_1.AppError(403, 'Please verify your email address before continuing');
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
                throw new errorHandler_1.AppError(403, 'Your account has been deactivated. Please contact support.');
            }
        }
        else {
            const user = await user_model_1.User.findByPk(req.user.id);
            if (!user || !user.isActive) {
                throw new errorHandler_1.AppError(403, 'Your account has been deactivated. Please contact support.');
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
        //const token = req.cookies.access_token_w || req.headers.authorization?.split(' ')[1];
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
        if (!token) {
            throw new errorHandler_1.AppError(401, 'Authentication required. Please login.');
        }
        try {
            const decoded = await jwt_util_1.JwtUtil.verifyToken(token);
            req.user = decoded;
            next();
        }
        catch (error) {
            // Handle specific JWT errors
            if (error.name === 'TokenExpiredError') {
                throw new errorHandler_1.AppError(401, 'Your session has expired. Please login again.');
            }
            else {
                throw new errorHandler_1.AppError(401, 'Invalid authentication token. Please login again.');
            }
        }
    }
    catch (error) {
        next(error);
    }
};
exports.requireAuth = requireAuth;
