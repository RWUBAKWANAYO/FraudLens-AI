// server/src/controllers/authController.ts
import { Request, Response } from "express";
import { AuthService } from "../services/authService";
import { AuthUtils } from "../utils/auth";
import { prisma } from "../config/db";

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { fullName, email, password, companyName, companySlug } = req.body;

      const result = await AuthService.registerUser({
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Verification token required" });
      }

      await AuthService.verifyEmail(token);

      res.json({ message: "Email verified successfully" });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { company: true },
      });

      if (!user || !user.isVerified) {
        return res.status(401).json({ error: "Invalid credentials or email not verified" });
      }

      const isValidPassword = await AuthUtils.comparePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      const token = AuthUtils.generateToken({
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async inviteUser(req: Request, res: Response) {
    try {
      const { email, role } = req.body;
      const inviterId = req.user!.id;

      const invitation = await AuthService.inviteUser(inviterId, { email, role });

      res.status(201).json({
        message: "Invitation sent successfully",
        invitationId: invitation.id,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async acceptInvitation(req: Request, res: Response) {
    try {
      const { token, password } = req.body;

      const user = await AuthService.acceptInvitation(token, password);

      res.json({
        message: "Invitation accepted successfully",
        userId: user.id,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      const result = await AuthService.forgotPassword({ email });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body;

      const result = await AuthService.resetPassword({ token, password });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }

      const user = await prisma.user.findUnique({
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
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
