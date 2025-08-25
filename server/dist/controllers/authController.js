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
exports.AuthController = void 0;
const authService_1 = require("../services/authService");
const auth_1 = require("../utils/auth");
const db_1 = require("../config/db");
class AuthController {
    static register(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { fullName, email, password, companyName, companySlug } = req.body;
                const result = yield authService_1.AuthService.registerUser({
                    fullName,
                    email,
                    password,
                    companyName,
                    companySlug,
                });
                res.status(201).json({
                    message: "User registered successfully. Please check your email for verification.",
                    userId: result.user.id,
                });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static verifyEmail(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { token } = req.query;
                if (!token || typeof token !== "string") {
                    return res.status(400).json({ error: "Verification token required" });
                }
                yield authService_1.AuthService.verifyEmail(token);
                res.json({ message: "Email verified successfully" });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static login(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, password } = req.body;
                const user = yield db_1.prisma.user.findUnique({
                    where: { email },
                    include: { company: true },
                });
                if (!user || !user.isVerified) {
                    return res.status(401).json({ error: "Invalid credentials or email not verified" });
                }
                const isValidPassword = yield auth_1.AuthUtils.comparePassword(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({ error: "Invalid credentials" });
                }
                // Update last login
                yield db_1.prisma.user.update({
                    where: { id: user.id },
                    data: { lastLogin: new Date() },
                });
                const token = auth_1.AuthUtils.generateToken({
                    userId: user.id,
                    email: user.email,
                    companyId: user.companyId,
                    role: user.role,
                });
                res.json({
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.fullName,
                        role: user.role,
                        company: {
                            id: user.company.id,
                            name: user.company.name,
                            slug: user.company.slug,
                        },
                    },
                });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static inviteUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email, role } = req.body;
                const inviterId = req.user.id;
                const invitation = yield authService_1.AuthService.inviteUser(inviterId, { email, role });
                res.status(201).json({
                    message: "Invitation sent successfully",
                    invitationId: invitation.id,
                });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static acceptInvitation(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { token, password } = req.body;
                const user = yield authService_1.AuthService.acceptInvitation(token, password);
                res.json({
                    message: "Invitation accepted successfully",
                    userId: user.id,
                });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static forgotPassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { email } = req.body;
                const result = yield authService_1.AuthService.forgotPassword({ email });
                res.json(result);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static resetPassword(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { token, password } = req.body;
                const result = yield authService_1.AuthService.resetPassword({ token, password });
                res.json(result);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static getCurrentUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (!req.user) {
                    return res.status(401).json({ error: "Not authenticated" });
                }
                const user = yield db_1.prisma.user.findUnique({
                    where: { id: req.user.id },
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        role: true,
                        isVerified: true,
                        lastLogin: true,
                        createdAt: true,
                        company: {
                            select: {
                                id: true,
                                name: true,
                                slug: true,
                            },
                        },
                    },
                });
                if (!user) {
                    return res.status(404).json({ error: "User not found" });
                }
                res.json({ user });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
}
exports.AuthController = AuthController;
