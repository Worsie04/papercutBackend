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
    static async sendMagicLink(email, magicLink) {
        const html = `
      <h1>Sign in to Worsie</h1>
      <p>Click the button below to sign in to your account:</p>
      <a href="${magicLink}" style="
        display: inline-block;
        padding: 10px 20px;
        background-color: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 5px;
      ">Sign In</a>
      <p>If you didn't request this sign-in link, you can safely ignore this email.</p>
      <p>This link will expire in 24 hours.</p>
    `;
        await this.sendEmail({
            to: email,
            subject: 'Sign in to Worsie',
            html,
        });
    }
    static async sendTemplateShareEmail(toEmail, sharedByUserFullName, templateName, templateId // Needed to create a link to the template
    ) {
        // --- Construct the URL to view the template ---
        // !!! IMPORTANT: Adjust this URL structure based on your frontend routing !!!
        // Example: Assumes a route like /dashboard/templates/shared/:templateId
        const templateViewUrl = `${config_1.config.clientUrl}/dashboard/Templates/Created/ViewTemplate?templateId=${templateId}`; // Using existing view for simplicity now
        // --------------------------------------------------
        const emailSubject = `Template Shared: ${templateName || 'Untitled Template'}`;
        const html = `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Template Shared With You</h2>
        <p>Hello,</p>
        <p><b>${sharedByUserFullName}</b> has shared the template "<b>${templateName || 'Untitled Template'}</b>" with you.</p>
        <p>You can view the template by clicking the button below:</p>
        <p style="margin: 20px 0;">
          <a href="${templateViewUrl}" style="
            display: inline-block;
            padding: 12px 25px;
            background-color: #007bff; /* Blue */
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
          ">View Template</a>
        </p>
        <p>Best regards,<br>The Worsie Team</p> {/* Adjust closing */}
      </div>
    `;
        try {
            await this.sendEmail({
                to: toEmail,
                subject: emailSubject,
                html,
            });
            console.log(`Template share email successfully sent to ${toEmail}`);
        }
        catch (error) {
            console.error(`Error sending template share email to ${toEmail}:`, error);
        }
    }
    static async sendReviewRequestEmail(toEmail, reviewerName, submitterFullName, letterName, letterViewUrl // Direct link to the review page/item
    ) {
        const emailSubject = `Review Request: ${letterName}`;
        const html = `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Letter Review Request</h2>
        <p>Hello ${reviewerName || 'Reviewer'},</p>
        <p><b>${submitterFullName}</b> has submitted the letter "<b>${letterName}</b>" which requires your review.</p>
        <p>Please review the letter by clicking the button below:</p>
        <p style="margin: 20px 0;">
          <a href="${letterViewUrl}" style="
            display: inline-block;
            padding: 12px 25px;
            background-color: #1890ff; /* Ant Design Primary Blue */
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-size: 16px;
          ">Review Letter</a>
        </p>
        <p>Best regards,<br>The Worsie Team</p> {/* Adjust closing */}
      </div>
    `;
        try {
            await this.sendEmail({
                to: toEmail,
                subject: emailSubject,
                html,
            });
            console.log(`Review request email successfully sent to ${toEmail} for letter "${letterName}"`);
        }
        catch (error) {
            console.error(`Error sending review request email to ${toEmail}:`, error);
        }
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
