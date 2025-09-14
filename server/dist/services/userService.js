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
exports.UserService = void 0;
const db_1 = require("../config/db");
const imageService_1 = require("./imageService");
const cloudinaryService_1 = require("./cloudinaryService");
class UserService {
    static getCompanyUsers(companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield db_1.prisma.user.findMany({
                where: { companyId },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    avatarUrl: true,
                    avatarPublicId: true,
                    isVerified: true,
                    lastLogin: true,
                    createdAt: true,
                    invitedBy: {
                        select: {
                            id: true,
                            fullName: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
            });
        });
    }
    static updateUserRole(companyId, userId, role, updaterId) {
        return __awaiter(this, void 0, void 0, function* () {
            const updater = yield db_1.prisma.user.findUnique({
                where: { id: updaterId },
            });
            if (!updater || updater.companyId !== companyId) {
                throw new Error("Unauthorized");
            }
            const isUserExist = yield db_1.prisma.user.findUnique({
                where: { id: userId },
            });
            if (!isUserExist) {
                throw new Error("User not found");
            }
            if (userId === updaterId && role !== "ADMIN") {
                const adminCount = yield db_1.prisma.user.count({
                    where: {
                        companyId,
                        role: "ADMIN",
                        id: { not: userId },
                    },
                });
                if (adminCount === 0) {
                    throw new Error("Cannot remove last admin");
                }
            }
            return yield db_1.prisma.user.update({
                where: { id: userId, companyId },
                data: { role: role },
            });
        });
    }
    static removeUser(companyId, userId, removerId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (userId === removerId) {
                throw new Error("Cannot remove yourself");
            }
            const userToRemove = yield db_1.prisma.user.findUnique({
                where: { id: userId, companyId },
            });
            if (!userToRemove) {
                throw new Error("User not found");
            }
            if (userToRemove.role === "ADMIN") {
                const adminCount = yield db_1.prisma.user.count({
                    where: {
                        companyId,
                        role: "ADMIN",
                        id: { not: userId },
                    },
                });
                if (adminCount === 0) {
                    throw new Error("Cannot remove last admin");
                }
            }
            return yield db_1.prisma.user.delete({
                where: { id: userId },
            });
        });
    }
    static updateImage(userId, companyId, imageData) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield db_1.prisma.user.findUnique({
                where: { id: userId, companyId },
            });
            if (!user) {
                throw new Error("User not found");
            }
            if (user.avatarPublicId) {
                yield cloudinaryService_1.CloudinaryService.deleteImage(user.avatarPublicId).catch((error) => console.error("Failed to delete old image:", error));
            }
            const avatarResult = yield imageService_1.ImageService.uploadImage(imageData.buffer, imageData.fileName, userId);
            const updatedUser = yield db_1.prisma.user.update({
                where: { id: userId },
                data: {
                    avatarUrl: avatarResult.url,
                    avatarPublicId: avatarResult.publicId,
                },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    avatarUrl: true,
                    avatarPublicId: true,
                },
            });
            return updatedUser;
        });
    }
    static deleteImage(userId, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield db_1.prisma.user.findUnique({
                where: { id: userId, companyId },
            });
            if (!user) {
                throw new Error("User not found");
            }
            if (!user.avatarPublicId) {
                throw new Error("No image to delete");
            }
            const deleteSuccess = yield cloudinaryService_1.CloudinaryService.deleteImage(user.avatarPublicId);
            if (!deleteSuccess) {
                throw new Error("Failed to delete avatar from storage");
            }
            const updatedUser = yield db_1.prisma.user.update({
                where: { id: userId },
                data: {
                    avatarUrl: null,
                    avatarPublicId: null,
                },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    role: true,
                    avatarUrl: true,
                },
            });
            return updatedUser;
        });
    }
}
exports.UserService = UserService;
