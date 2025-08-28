import { Request, Response } from "express";
import { UserService } from "../services/userService";

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
}
