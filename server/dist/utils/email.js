"use strict";
// server/src/utils/email.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = exports.APP_CONFIG = exports.EMAIL_CONFIG = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
exports.EMAIL_CONFIG = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
};
exports.APP_CONFIG = {
    frontendUrl: process.env.FRONTEND_URL,
    apiUrl: process.env.API_URL,
};
const transporter = nodemailer_1.default.createTransport(exports.EMAIL_CONFIG);
class EmailService {
    static sendVerificationEmail(email, token, fullName) {
        return __awaiter(this, void 0, void 0, function* () {
            const verificationUrl = `${exports.APP_CONFIG.frontendUrl}/verify-email?token=${token}`;
            yield transporter.sendMail({
                from: process.env.SMTP_FROM || "noreply@revenueleak.com",
                to: email,
                subject: "Verify Your Email - FraudLens AI",
                html: `
        <h2>Welcome to FraudLens AI, ${fullName}!</h2>
        <p>Please click the link below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #fd892f; color: white; text-decoration: none; border-radius: 4px;">
          Verify Email
        </a>
        <p>Or copy this link: ${verificationUrl}</p>
      `,
            });
        });
    }
    static sendInvitationEmail(email, token, inviterName, companyName) {
        return __awaiter(this, void 0, void 0, function* () {
            const invitationUrl = `${exports.APP_CONFIG.frontendUrl}/accept-invitation?token=${token}`;
            yield transporter.sendMail({
                from: process.env.SMTP_FROM || "noreply@revenueleak.com",
                to: email,
                subject: `You've been invited to join ${companyName} on FraudLens AI`,
                html: `
        <h2>You've been invited!</h2>
        <p>${inviterName} has invited you to join ${companyName} on FraudLens AI.</p>
        <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #fd892f; color: white; text-decoration: none; border-radius: 4px;">
          Accept Invitation
        </a>
        <p>Or copy this link: ${invitationUrl}</p>
      `,
            });
        });
    }
    static sendPasswordResetEmail(email, token, fullName) {
        return __awaiter(this, void 0, void 0, function* () {
            const resetUrl = `${exports.APP_CONFIG.frontendUrl}/reset-password?token=${token}`;
            yield transporter.sendMail({
                from: process.env.SMTP_FROM || "noreply@revenueleak.com",
                to: email,
                subject: "Reset Your Password - FraudLens AI",
                html: `
        <h2>Password Reset Request</h2>
        <p>Hello ${fullName},</p>
        <p>You requested to reset your password. Click the link below:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #fd892f; color: white; text-decoration: none; border-radius: 4px;">
          Reset Password
        </a>
        <p>Or copy this link: ${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
      `,
            });
        });
    }
}
exports.EmailService = EmailService;
