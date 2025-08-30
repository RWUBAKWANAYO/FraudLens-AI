import { UserRole } from "@prisma/client";
import { prisma } from "../config/db";

export class UserService {
  static async getCompanyUsers(companyId: string) {
    return await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
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
}
