import { UserRole } from "@prisma/client";
import { prisma } from "../config/db";
import { ImageService } from "./imageService";
import { CloudinaryService } from "./cloudinaryService";

export class UserService {
  static async getCompanyUsers(companyId: string) {
    return await prisma.user.findMany({
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
  }

  static async updateUserRole(companyId: string, userId: string, role: string, updaterId: string) {
    const updater = await prisma.user.findUnique({
      where: { id: updaterId },
    });

    if (!updater || updater.companyId !== companyId) {
      throw new Error("Unauthorized");
    }

    const isUserExist = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!isUserExist) {
      throw new Error("User not found");
    }

    if (userId === updaterId && role !== "ADMIN") {
      const adminCount = await prisma.user.count({
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

    return await prisma.user.update({
      where: { id: userId, companyId },
      data: { role: role as UserRole },
    });
  }

  static async removeUser(companyId: string, userId: string, removerId: string) {
    if (userId === removerId) {
      throw new Error("Cannot remove yourself");
    }

    const userToRemove = await prisma.user.findUnique({
      where: { id: userId, companyId },
    });

    if (!userToRemove) {
      throw new Error("User not found");
    }

    if (userToRemove.role === "ADMIN") {
      const adminCount = await prisma.user.count({
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

    return await prisma.user.delete({
      where: { id: userId },
    });
  }

  static async updateImage(
    userId: string,
    companyId: string,
    imageData: { buffer: Buffer; fileName: string }
  ) {
    const user = await prisma.user.findUnique({
      where: { id: userId, companyId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.avatarPublicId) {
      await CloudinaryService.deleteImage(user.avatarPublicId).catch((error) =>
        console.error("Failed to delete old image:", error)
      );
    }

    const avatarResult = await ImageService.uploadImage(
      imageData.buffer,
      imageData.fileName,
      userId
    );

    const updatedUser = await prisma.user.update({
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
  }

  static async deleteImage(userId: string, companyId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId, companyId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (!user.avatarPublicId) {
      throw new Error("No image to delete");
    }

    const deleteSuccess = await CloudinaryService.deleteImage(user.avatarPublicId);

    if (!deleteSuccess) {
      throw new Error("Failed to delete avatar from storage");
    }

    const updatedUser = await prisma.user.update({
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
  }
}
