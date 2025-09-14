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
exports.UserController = void 0;
const userService_1 = require("../services/userService");
const uuid_1 = require("uuid");
class UserController {
    static getUsers(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const companyId = req.user.companyId;
                const users = yield userService_1.UserService.getCompanyUsers(companyId);
                res.json(users);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static updateUserRole(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const companyId = req.user.companyId;
                const { userId } = req.params;
                const { role } = req.body;
                const updaterId = req.user.id;
                const user = yield userService_1.UserService.updateUserRole(companyId, userId, role, updaterId);
                res.json({
                    message: "User role updated successfully",
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role,
                    },
                });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static removeUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const companyId = req.user.companyId;
                const { userId } = req.params;
                const removerId = req.user.id;
                yield userService_1.UserService.removeUser(companyId, userId, removerId);
                res.json({ message: "User removed successfully" });
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }
    static uploadAvatar(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const companyId = req.user.companyId;
                const userId = req.params.userId || req.user.id;
                if (!req.file) {
                    return res.status(400).json({ error: "No image file provided" });
                }
                const user = yield userService_1.UserService.updateImage(userId, companyId, {
                    buffer: req.file.buffer,
                    fileName: `avatar_${(0, uuid_1.v4)()}_${req.file.originalname}`,
                });
                res.json({
                    message: "Avatar uploaded successfully",
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.fullName,
                        avatarUrl: user.avatarUrl,
                        avatarPublicId: user.avatarPublicId,
                    },
                });
            }
            catch (error) {
                console.error("Avatar upload error:", error);
                res.status(400).json({ error: error.message });
            }
        });
    }
    static deleteAvatar(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const companyId = req.user.companyId;
                const userId = req.params.userId || req.user.id;
                const user = yield userService_1.UserService.deleteImage(userId, companyId);
                res.json({
                    message: "Avatar deleted successfully",
                    user: {
                        id: user.id,
                        email: user.email,
                        fullName: user.fullName,
                        avatarUrl: user.avatarUrl,
                    },
                });
            }
            catch (error) {
                console.error("Avatar deletion error:", error);
                res.status(400).json({ error: error.message });
            }
        });
    }
}
exports.UserController = UserController;
