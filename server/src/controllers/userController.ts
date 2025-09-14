import { Request, Response } from "express";
import { UserService } from "../services/userService";
import { v4 as uuidv4 } from "uuid";

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const users = await UserService.getCompanyUsers(companyId);

      res.json(users);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async updateUserRole(req: Request, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { userId } = req.params;
      const { role } = req.body;
      const updaterId = req.user!.id;

      const user = await UserService.updateUserRole(companyId, userId, role, updaterId);

      res.json({
        message: "User role updated successfully",
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async removeUser(req: Request, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const { userId } = req.params;
      const removerId = req.user!.id;

      await UserService.removeUser(companyId, userId, removerId);

      res.json({ message: "User removed successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async uploadAvatar(req: Request, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.params.userId || req.user!.id;

      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const user = await UserService.updateImage(userId, companyId, {
        buffer: req.file.buffer,
        fileName: `avatar_${uuidv4()}_${req.file.originalname}`,
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
    } catch (error: any) {
      console.error("Avatar upload error:", error);
      res.status(400).json({ error: error.message });
    }
  }

  static async deleteAvatar(req: Request, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const userId = req.params.userId || req.user!.id;

      const user = await UserService.deleteImage(userId, companyId);

      res.json({
        message: "Avatar deleted successfully",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          avatarUrl: user.avatarUrl,
        },
      });
    } catch (error: any) {
      console.error("Avatar deletion error:", error);
      res.status(400).json({ error: error.message });
    }
  }
}
