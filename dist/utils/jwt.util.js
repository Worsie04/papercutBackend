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
        return jsonwebtoken_1.default.sign(payload, this.SECRET, {
            expiresIn: this.EXPIRES_IN,
        });
    }
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.SECRET);
        }
        catch (error) {
            throw new Error('Invalid token');
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
    static generateRefreshToken(userId, type) {
        return jsonwebtoken_1.default.sign({ id: userId, type }, this.SECRET, {
            expiresIn: '7d',
        });
    }
}
exports.JwtUtil = JwtUtil;
JwtUtil.SECRET = config_1.config.jwt.secret;
JwtUtil.EXPIRES_IN = config_1.config.jwt.expiresIn;
