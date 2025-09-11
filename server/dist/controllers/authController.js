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
                yield db_1.prisma.user.update({
                    where: { id: user.id },
                    data: { lastLogin: new Date() },
                });
                const accessToken = auth_1.AuthUtils.generateAccessToken({
                    userId: user.id,
                    email: user.email,
                    companyId: user.companyId,
                    role: user.role,
                });
                const refreshToken = auth_1.AuthUtils.generateRefreshToken({
                    userId: user.id,
                    email: user.email,
                });
                yield db_1.prisma.user.update({
                    where: { id: user.id },
                    data: { refreshToken, lastLogin: new Date() },
                });
                const isProduction = process.env.NODE_ENV === "production";
                res.cookie("jwt", refreshToken, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: isProduction ? "none" : "lax",
                    maxAge: 7 * 24 * 60 * 60 * 1000,
                });
                res.json({
                    accessToken,
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
    static refreshToken(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cookies = req.cookies;
                if (!(cookies === null || cookies === void 0 ? void 0 : cookies.jwt)) {
                    return res.status(401).json({ error: "Refresh token required" });
                }
                const refreshToken = cookies.jwt;
                const user = yield db_1.prisma.user.findFirst({
                    where: { refreshToken },
                    include: { company: true },
                });
                if (!user) {
                    res.clearCookie("jwt");
                    return res.status(403).json({ error: "Invalid refresh token" });
                }
                try {
                    const decoded = auth_1.AuthUtils.verifyRefreshToken(refreshToken);
                    if (user.id !== decoded.userId) {
                        yield db_1.prisma.user.update({
                            where: { id: user.id },
                            data: { refreshToken: null },
                        });
                        res.clearCookie("jwt");
                        return res.status(403).json({ error: "Token mismatch" });
                    }
                    const accessToken = auth_1.AuthUtils.generateAccessToken({
                        userId: user.id,
                        email: user.email,
                        companyId: user.companyId,
                        role: user.role,
                    });
                    res.json({
                        accessToken,
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
                    if (error.name === "TokenExpiredError") {
                        yield db_1.prisma.user.update({
                            where: { id: user.id },
                            data: { refreshToken: null },
                        });
                        res.clearCookie("jwt");
                        return res.status(403).json({ error: "Refresh token expired" });
                    }
                    yield db_1.prisma.user.update({
                        where: { id: user.id },
                        data: { refreshToken: null },
                    });
                    res.clearCookie("jwt");
                    return res.status(403).json({ error: "Invalid refresh token" });
                }
            }
            catch (error) {
                console.error("Refresh token error:", error);
                res.status(500).json({ error: "Internal server error" });
            }
        });
    }
    static logout(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cookies = req.cookies;
                if (!(cookies === null || cookies === void 0 ? void 0 : cookies.jwt)) {
                    res.clearCookie("jwt");
                    return res.sendStatus(204);
                }
                const refreshToken = cookies.jwt;
                const user = yield db_1.prisma.user.findFirst({
                    where: { refreshToken },
                });
                if (user) {
                    yield db_1.prisma.user.update({
                        where: { id: user.id },
                        data: { refreshToken: null },
                    });
                }
                res.clearCookie("jwt");
                res.sendStatus(204);
            }
            catch (error) {
                console.error("Logout error:", error);
                res.status(500).json({ error: "Internal server error" });
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
