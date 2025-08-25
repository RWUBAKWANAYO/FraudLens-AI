// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import { AuthUtils } from "../utils/auth";
import { prisma } from "../config/db";

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header required" });
    }

    const [bearer, token] = authHeader.split(" ");

    if (bearer !== "Bearer" || !token) {
      return res.status(401).json({ error: "Invalid authorization format. Use: Bearer <token>" });
    }

    const payload = AuthUtils.verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        isVerified: true,
        role: true,
        companyId: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(401).json({ error: "Please verify your email before logging in" });
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    };

    next();
  } catch (error: any) {
    console.error("Authentication error:", error);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }

    return res.status(500).json({ error: "Authentication failed" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Insufficient permissions",
        requiredRoles: roles,
        userRole: req.user.role,
      });
    }
    next();
  };
};
