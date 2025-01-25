import nodemailer from 'nodemailer';
import { config } from '../config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export class EmailService {
  private static transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.secure,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  static async sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: `"${config.email.fromName}" <${config.email.fromAddress}>`,
      to,
      subject,
      html,
    });
  }

  static async sendVerificationEmail(email: string, token: string, type: 'user' | 'admin'): Promise<void> {
    const verificationUrl = `${config.clientUrl}/${type}/verify-email?token=${token}`;
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

  static async sendPasswordResetEmail(email: string, token: string, type: 'user' | 'admin'): Promise<void> {
    const resetUrl = `${config.clientUrl}/${type}/reset-password?token=${token}`;
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