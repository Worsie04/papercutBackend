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
            // Special case for /auth/verify endpoint to handle optional authentication
            const isVerifyEndpoint = req.path === '/verify';
            let token;
            // Debug request details
            console.log(`Request path: ${req.path}, Method: ${req.method}`);
            console.log(`Cookie keys: ${req.cookies ? Object.keys(req.cookies).join(', ') : 'No cookies'}`);
            // Check cookie first (primary auth method)
            if (req.cookies && req.cookies.access_token_w) {
                token = req.cookies.access_token_w;
                console.log('Found token in cookies');
            }
            // If no cookie token, check Authorization header (fallback)
            if (!token) {
                const authHeader = req.headers.authorization;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    token = authHeader.substring(7);
                    console.log('Found token in Authorization header');
                }
            }
            if (!token || typeof token !== 'string' || token.trim() === '') {
                if (isVerifyEndpoint) {
                    // For verify endpoint, just proceed with no user
                    console.log('Verify endpoint accessed without token - this is normal');
                    req.user = undefined;
                    return next();
                }
                console.log('No token found in request', {
                    cookies: req.cookies ? 'Has cookies' : 'No cookies',
                    headers: req.headers ? 'Has headers' : 'No headers',
                    authorization: ((_a = req.headers) === null || _a === void 0 ? void 0 : _a.authorization) ? 'Has auth header' : 'No auth header'
                });
                // Return 401 with proper message
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required. Please log in.'
                });
            }
            try {
                const decoded = jwt_util_1.JwtUtil.verifyToken(token.trim());
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    type: decoded.type,
                    role: decoded.role
                };
                next();
            }
            catch (error) {
                if (isVerifyEndpoint) {
                    // For verify endpoint, just proceed with no user
                    req.user = undefined;
                    return next();
                }
                console.error('Token verification failed:', error);
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
        // Check for token in cookies first, then header as fallback
        let token = req.cookies.access_token_w;
        // If token not in cookies, check Authorization header
        if (!token && ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.startsWith('Bearer '))) {
            token = req.headers.authorization.split(' ')[1];
        }
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
