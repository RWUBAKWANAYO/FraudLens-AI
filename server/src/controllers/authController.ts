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
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      const accessToken = AuthUtils.generateAccessToken({
        userId: user.id,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
      });

      const refreshToken = AuthUtils.generateRefreshToken({
        userId: user.id,
        email: user.email,
      });

      await prisma.user.update({
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
          avatarUrl: user.avatarUrl,
          avatarPublicId: user.avatarPublicId,

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

  static async refreshToken(req: Request, res: Response) {
    try {
      const cookies = req.cookies;
      if (!cookies?.jwt) {
        return res.status(401).json({ error: "Refresh token required" });
      }

      const refreshToken = cookies.jwt;

      const user = await prisma.user.findFirst({
        where: { refreshToken },
        include: { company: true },
      });

      if (!user) {
        res.clearCookie("jwt");
        return res.status(403).json({ error: "Invalid refresh token" });
      }

      try {
        const decoded = AuthUtils.verifyRefreshToken(refreshToken);

        if (user.id !== decoded.userId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: null },
          });

          res.clearCookie("jwt");

          return res.status(403).json({ error: "Token mismatch" });
        }

        const accessToken = AuthUtils.generateAccessToken({
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
            avatarUrl: user.avatarUrl,
            avatarPublicId: user.avatarPublicId,
            company: {
              id: user.company.id,
              name: user.company.name,
              slug: user.company.slug,
            },
          },
        });
      } catch (error: any) {
        if (error.name === "TokenExpiredError") {
          await prisma.user.update({
            where: { id: user.id },
            data: { refreshToken: null },
          });

          res.clearCookie("jwt");
          return res.status(403).json({ error: "Refresh token expired" });
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });

        res.clearCookie("jwt");
        return res.status(403).json({ error: "Invalid refresh token" });
      }
    } catch (error: any) {
      console.error("Refresh token error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const cookies = req.cookies;
      if (!cookies?.jwt) {
        res.clearCookie("jwt");
        return res.sendStatus(204);
      }
      const refreshToken = cookies.jwt;
      const user = await prisma.user.findFirst({
        where: { refreshToken },
      });

      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { refreshToken: null },
        });
      }

      res.clearCookie("jwt");

      res.sendStatus(204);
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
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
