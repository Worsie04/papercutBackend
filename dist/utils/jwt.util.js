"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtUtil = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
class JwtUtil {
    static generateToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.SECRET, { expiresIn: this.EXPIRES_IN });
    }
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.SECRET);
        }
        catch (error) {
            // Provide more specific error messages based on the type of error
            if (error.name === 'TokenExpiredError') {
                throw new Error('Token has expired');
            }
            else if (error.name === 'JsonWebTokenError') {
                throw new Error(`Invalid token: ${error.message}`);
            }
            else {
                throw new Error(`Token verification failed: ${error.message}`);
            }
        }
    }
    static decodeToken(token) {
        try {
            return jsonwebtoken_1.default.decode(token);
        }
        catch (_a) {
            return null;
        }
    }
    static generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.SECRET, { expiresIn: this.REFRESH_EXPIRES_IN });
    }
    static verifyRefreshToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.SECRET);
        }
        catch (error) {
            // Provide more specific error messages based on the type of error
            if (error.name === 'TokenExpiredError') {
                throw new Error('Refresh token has expired');
            }
            else if (error.name === 'JsonWebTokenError') {
                throw new Error(`Invalid refresh token: ${error.message}`);
            }
            else {
                throw new Error(`Refresh token verification failed: ${error.message}`);
            }
        }
    }
}
exports.JwtUtil = JwtUtil;
JwtUtil.SECRET = config_1.config.jwt.secret;
JwtUtil.EXPIRES_IN = config_1.config.jwt.expiresIn;
JwtUtil.REFRESH_EXPIRES_IN = '7d'; // 7 days
