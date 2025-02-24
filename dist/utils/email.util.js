"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInvitationEmail = sendInvitationEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create a transporter using existing email configuration
const transporter = nodemailer_1.default.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});
async function sendInvitationEmail({ to, spaceName, inviterName, role, message, invitationLink, }) {
    const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1);
    const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">You've been invited to join ${spaceName}</h2>
      <p style="color: #4a4a4a; font-size: 16px;">
        ${inviterName} has invited you to join <strong>${spaceName}</strong> as a <strong>${roleDisplay}</strong>.
      </p>
      ${message ? `
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #666; font-style: italic;">"${message}"</p>
        </div>
      ` : ''}
      <div style="margin: 30px 0;">
        <a href="${invitationLink}" 
           style="background-color: #1890ff; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  display: inline-block;">
          Accept Invitation
        </a>
      </div>
      <p style="color: #666; font-size: 14px;">
        If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
        <a href="${invitationLink}" style="color: #1890ff;">${invitationLink}</a>
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      <p style="color: #999; font-size: 12px;">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </div>
  `;
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
        to,
        subject: `Invitation to join ${spaceName} on Worsie`,
        html: htmlContent,
    };
    try {
        await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.error('Error sending invitation email:', error);
        throw new Error('Failed to send invitation email');
    }
}
