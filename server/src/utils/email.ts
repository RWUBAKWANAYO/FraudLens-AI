// server/src/utils/email.ts

import nodemailer from "nodemailer";

export const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

export const APP_CONFIG = {
  frontendUrl: process.env.FRONTEND_URL!,
  apiUrl: process.env.API_URL!,
};

const transporter = nodemailer.createTransport(EMAIL_CONFIG);

export class EmailService {
  static async sendVerificationEmail(email: string, token: string, fullName: string) {
    const verificationUrl = `${APP_CONFIG.frontendUrl}/verify-email?token=${token}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@revenueleak.com",
      to: email,
      subject: "Verify Your Email - Revenue Leak Detection",
      html: `
        <h2>Welcome to Revenue Leak Detection, ${fullName}!</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
          Verify Email
        </a>
        <p>Or copy this link: ${verificationUrl}</p>
      `,
    });
  }

  static async sendInvitationEmail(
    email: string,
    token: string,
    inviterName: string,
    companyName: string
  ) {
    const invitationUrl = `${APP_CONFIG.frontendUrl}/accept-invitation?token=${token}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@revenueleak.com",
      to: email,
      subject: `You've been invited to join ${companyName} on Revenue Leak Detection`,
      html: `
        <h2>You've been invited!</h2>
        <p>${inviterName} has invited you to join ${companyName} on Revenue Leak Detection.</p>
        <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
          Accept Invitation
        </a>
        <p>Or copy this link: ${invitationUrl}</p>
      `,
    });
  }

  static async sendPasswordResetEmail(email: string, token: string, fullName: string) {
    const resetUrl = `${APP_CONFIG.frontendUrl}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@revenueleak.com",
      to: email,
      subject: "Reset Your Password - Revenue Leak Detection",
      html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${fullName},</p>
        <p>You requested to reset your password. Click the link below:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
      `,
    });
  }
}
