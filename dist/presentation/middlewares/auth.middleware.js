"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = exports.requireActive = exports.requireVerifiedEmail = exports.requireAdmin = exports.authenticate = void 0;
const jwt_util_1 = require("../../utils/jwt.util"); // JwtUtil import etdiyinizdən əmin olun
const errorHandler_1 = require("./errorHandler");
const admin_model_1 = require("../../models/admin.model");
const user_model_1 = require("../../models/user.model");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken")); // jwt kitabxanasını import edin
const authenticate = (type) => {
    return async (req, res, next) => {
        var _a;
        let token; // Tokeni try-catch xaricində əlçatan etmək üçün
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
            if (!token) {
                if (!req.cookies) {
                    console.warn('Cookies not parsed. Ensure cookie-parser middleware is used before authentication.');
                    (0, cookie_parser_1.default)()(req, res, () => { });
                }
                token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.access_token_w;
            }
            if (!token) {
                throw new errorHandler_1.AppError(401, 'No token provided');
            }
            if (typeof token !== 'string' || token.trim() === '') {
                throw new errorHandler_1.AppError(401, 'Invalid token format');
            }
            try {
                const decoded = await jwt_util_1.JwtUtil.verifyToken(token.trim()); // verifyToken özü xəta ata bilər
                req.user = {
                    id: decoded.id,
                    email: decoded.email,
                    type: decoded.type,
                    role: decoded.role
                };
                next();
            }
            catch (error) { // verification xətasını burada tuturuq
                res.clearCookie('access_token_w', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax'
                });
                // Xətanın detallarını və tokenin məzmununu log edək
                console.error('JWT Verification Error Caught:', error.message);
                if (token) { // Əgər token varsa, onu dekodlayaq
                    try {
                        const decodedPayload = jsonwebtoken_1.default.decode(token.trim()); // Yalnız dekodlama, yoxlama yox
                        console.error('Decoded token payload (on error):', decodedPayload);
                        if (decodedPayload && typeof decodedPayload === 'object' && decodedPayload.exp) {
                            console.error(`Token expiration timestamp (exp): ${decodedPayload.exp} (${new Date(decodedPayload.exp * 1000).toISOString()})`);
                            console.error(`Current server time: ${Math.floor(Date.now() / 1000)} (${new Date().toISOString()})`);
                        }
                    }
                    catch (decodeError) {
                        console.error('Could not decode the token:', decodeError);
                    }
                }
                // Xətanın növünə görə mesaj verək (JwtUtil içindəki error handling artıq bunu edir)
                if (error.message.startsWith('Token has expired')) {
                    throw new errorHandler_1.AppError(401, 'Token has expired');
                }
                else if (error.message.startsWith('Invalid token')) {
                    throw new errorHandler_1.AppError(401, `Invalid token: ${error.message}`);
                }
                else {
                    throw new errorHandler_1.AppError(401, `Token verification failed: ${error.message}`);
                }
            }
        }
        catch (error) { // Ümumi xətaları tutmaq üçün (məs. "No token provided")
            next(error);
        }
    };
};
exports.authenticate = authenticate;
// --- Digər middleware funksiyaları (requireAdmin, requireVerifiedEmail, etc.) olduğu kimi qalır ---
// ... (əvvəlki cavabdakı kimi) ...
const requireAdmin = (roles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new errorHandler_1.AppError(401, 'Authentication required');
            }
            if (req.user.type !== 'admin' && req.user.role !== 'super_admin') {
                throw new errorHandler_1.AppError(403, 'Admin access required');
            }
            if (roles && roles.length > 0) {
                if (req.user.role === 'super_admin') {
                    return next();
                }
                if (req.user.type === 'admin') {
                    const admin = await admin_model_1.Admin.findByPk(req.user.id);
                    if (!admin || !roles.includes(admin.role)) {
                        throw new errorHandler_1.AppError(403, 'You do not have the required permissions for this action');
                    }
                }
                else {
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
    // Bu funksiya authenticate ilə çox oxşar olduğu üçün,
    // çaşqınlıq yaratmamaq adına bütün route-larda yalnız birini (məsələn, authenticate)
    // istifadə etməyi nəzərdən keçirin. Əgər fərqli məqsədlər üçün saxlanılıbsa,
    // onda bu funksiyanı da yuxarıdakı kimi loglama ilə yeniləmək olar.
    // Hazırda dəyişikliksiz saxlanılır:
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        if (!token) {
            if (!req.cookies) {
                (0, cookie_parser_1.default)()(req, res, () => { });
            }
            token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.access_token_w;
        }
        if (!token) {
            throw new errorHandler_1.AppError(401, 'Authentication required. Please login.');
        }
        try {
            const decoded = await jwt_util_1.JwtUtil.verifyToken(token.trim());
            req.user = decoded;
            next();
        }
        catch (error) {
            res.clearCookie('access_token_w', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax' // Use lax
            });
            console.error('JWT Verification Error (requireAuth):', error);
            if (error.name === 'TokenExpiredError') {
                throw new errorHandler_1.AppError(401, 'Your session has expired. Please login again.');
            }
            else if (error.name === 'JsonWebTokenError') {
                throw new errorHandler_1.AppError(401, `Invalid token: ${error.message}`);
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
