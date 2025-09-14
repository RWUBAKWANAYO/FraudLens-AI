"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const db_1 = require("../config/db");
const auth_1 = require("../utils/auth");
const email_1 = require("../utils/email");
class AuthService {
    static registerUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const existingCompany = yield db_1.prisma.company.findUnique({
                where: { slug: data.companySlug },
            });
            if (existingCompany) {
                throw new Error("Company slug already exists");
            }
            const existingUser = yield db_1.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (existingUser) {
                throw new Error("Email already registered");
            }
            const result = yield db_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const company = yield tx.company.create({
                    data: {
                        name: data.companyName,
                        slug: data.companySlug,
                    },
                });
                let hashedPassword;
                try {
                    hashedPassword = yield auth_1.AuthUtils.hashPassword(data.password);
                }
                catch (error) {
                    throw new Error("Failed to process password");
                }
                const verificationToken = auth_1.AuthUtils.generateRandomToken();
                const user = yield tx.user.create({
                    data: {
                        email: data.email,
                        password: hashedPassword,
                        fullName: data.fullName,
                        companyId: company.id,
                        role: "ADMIN",
                        verificationToken,
                    },
                });
                return { user, company, verificationToken };
            }));
            try {
                yield email_1.EmailService.sendVerificationEmail(data.email, result.verificationToken, data.fullName);
            }
            catch (emailError) { }
            return result;
        });
    }
    static verifyEmail(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield db_1.prisma.user.findFirst({
                where: { verificationToken: token },
            });
            if (!user) {
                throw new Error("Invalid verification token");
            }
            yield db_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    isVerified: true,
                    verificationToken: null,
                },
            });
            return user;
        });
    }
    static inviteUser(inviterId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            const inviter = yield db_1.prisma.user.findUnique({
                where: { id: inviterId },
                include: { company: true },
            });
            if (!inviter) {
                throw new Error("Inviter not found");
            }
            const existingUser = yield db_1.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (existingUser) {
                throw new Error("User already exists");
            }
            const existingInvitation = yield db_1.prisma.invitation.findFirst({
                where: {
                    email: data.email,
                    companyId: inviter.companyId,
                    accepted: false,
                    expiresAt: { gt: new Date() },
                },
            });
            if (existingInvitation) {
                throw new Error("Active invitation already exists");
            }
            const token = auth_1.AuthUtils.generateRandomToken();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const invitation = yield db_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                return yield tx.invitation.create({
                    data: {
                        email: data.email,
                        companyId: inviter.companyId,
                        invitedById: inviterId,
                        role: data.role,
                        token,
                        expiresAt,
                    },
                });
            }));
            try {
                yield email_1.EmailService.sendInvitationEmail(data.email, token, inviter.fullName, inviter.company.name);
            }
            catch (emailError) { }
            return invitation;
        });
    }
    static acceptInvitation(token, password) {
        return __awaiter(this, void 0, void 0, function* () {
            const invitation = yield db_1.prisma.invitation.findFirst({
                where: {
                    token,
                    expiresAt: { gt: new Date() },
                    accepted: false,
                },
                include: { company: true, invitedBy: true },
            });
            if (!invitation) {
                throw new Error("Invalid or expired invitation");
            }
            const hashedPassword = yield auth_1.AuthUtils.hashPassword(password);
            return yield db_1.prisma.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const user = yield tx.user.create({
                    data: {
                        email: invitation.email,
                        password: hashedPassword,
                        fullName: invitation.email.split("@")[0],
                        companyId: invitation.companyId,
                        role: invitation.role,
                        isVerified: true,
                        invitedById: invitation.invitedById,
                    },
                });
                yield tx.invitation.update({
                    where: { id: invitation.id },
                    data: { accepted: true },
                });
                return user;
            }));
        });
    }
    static forgotPassword(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield db_1.prisma.user.findUnique({
                where: { email: data.email },
            });
            if (!user) {
                return { message: "If the email exists, a password reset link has been sent" };
            }
            const resetToken = auth_1.AuthUtils.generateRandomToken();
            const resetTokenExpiry = new Date(Date.now() + 3600000);
            yield db_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    resetToken,
                    resetTokenExpiry,
                },
            });
            try {
                yield email_1.EmailService.sendPasswordResetEmail(user.email, resetToken, user.fullName);
            }
            catch (emailError) { }
            return { message: "If the email exists, a password reset link has been sent" };
        });
    }
    static resetPassword(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield db_1.prisma.user.findFirst({
                where: {
                    resetToken: data.token,
                    resetTokenExpiry: { gt: new Date() },
                },
            });
            if (!user) {
                throw new Error("Invalid or expired reset token");
            }
            const hashedPassword = yield auth_1.AuthUtils.hashPassword(data.password);
            yield db_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null,
                },
            });
            return { message: "Password reset successfully" };
        });
    }
}
exports.AuthService = AuthService;
