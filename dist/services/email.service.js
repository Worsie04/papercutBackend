"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../config");
class EmailService {
    static async sendEmail({ to, subject, html }) {
        await this.transporter.sendMail({
            from: `"${config_1.config.email.fromName}" <${config_1.config.email.fromAddress}>`,
            to,
            subject,
            html,
        });
    }
    static async sendVerificationEmail(email, token, type) {
        const verificationUrl = `${config_1.config.clientUrl}/${type}/verify-email?token=${token}`;
        const html = `
      <h1>Email Verification</h1>
      <p>Please click the button below to verify your email address:</p>
      <a href="${verificationUrl}" style="
        display: inline-block;
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      ">Verify Email</a>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    `;
        await this.sendEmail({
            to: email,
            subject: 'Verify Your Email',
            html,
        });
    }
    static async sendPasswordResetEmail(email, token, type) {
        const resetUrl = `${config_1.config.clientUrl}/${type}/reset-password?token=${token}`;
        const html = `
      <h1>Password Reset</h1>
      <p>You requested to reset your password. Click the button below to proceed:</p>
      <a href="${resetUrl}" style="
        display: inline-block;
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      ">Reset Password</a>
      <p>If you didn't request a password reset, you can safely ignore this email.</p>
      <p>This link will expire in 1 hour.</p>
    `;
        await this.sendEmail({
            to: email,
            subject: 'Reset Your Password',
            html,
        });
    }
}
exports.EmailService = EmailService;
EmailService.transporter = nodemailer_1.default.createTransport({
    host: config_1.config.email.host,
    port: config_1.config.email.port,
    secure: config_1.config.email.secure,
    auth: {
        user: config_1.config.email.user,
        pass: config_1.config.email.password,
    },
});
