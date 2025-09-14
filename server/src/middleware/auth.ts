import { Request, Response, NextFunction } from "express";
import { AuthUtils } from "../utils/auth";
import { prisma } from "../config/db";
import { createHmac } from "crypto";

export const authenticateTokenOrApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [bearer, token] = authHeader.split(" ");

      if (bearer === "Bearer" && token) {
        return await handleJwtAuth(req, res, next, token);
      }

      const [keyType, credentials] = authHeader.split(" ");

      if (keyType === "APIKey" && credentials) {
        return await handleApiKeyAuth(req, res, next, credentials);
      }
    }

    const apiKey = req.headers["x-api-key"] as string;
    const apiSecret = req.headers["x-api-secret"] as string;

    if (apiKey && apiSecret) {
      return await handleApiKeyAuth(req, res, next, `${apiKey}:${apiSecret}`);
    }

    if (req.query.apiKey && req.query.apiSecret) {
      return await handleApiKeyAuth(req, res, next, `${req.query.apiKey}:${req.query.apiSecret}`);
    }

    return res.status(401).json({
      error: "Authentication required",
    });
  } catch (error) {
    return res.status(500).json({ error: "Authentication failed" });
  }
};

const handleJwtAuth = async (req: Request, res: Response, next: NextFunction, token: string) => {
  try {
    const payload = AuthUtils.verifyAccessToken(token);

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

    req.user = {
      id: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      authMethod: "jwt",
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expired",
        code: "TOKEN_EXPIRED",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token" });
    }
    return res.status(401).json({ error: "Authentication failed" });
  }
};

const handleApiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
  credentials: string
) => {
  try {
    const [key, secret] = credentials.split(":");

    if (!key || !secret) {
      return res.status(401).json({
        error: "Invalid API key format",
      });
    }

    const hashedSecret = createHmac("sha256", process.env.API_KEY_SECRET_SALT || "default-salt")
      .update(secret)
      .digest("hex");

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        key,
        secret: hashedSecret,
        enabled: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!apiKey) {
      return res.status(401).json({
        error: "Invalid API credentials or API key not found or disabled",
      });
    }

    await prisma.apiKey.updateMany({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    req.user = {
      id: apiKey.createdBy,
      email: `api-key-${apiKey.id}@company.com`,
      companyId: apiKey.companyId,
      role: "API_CLIENT",
      authMethod: "api_key",
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Authentication failed" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.authMethod === "api_key") {
      const allowedApiKeyRoles = ["ADMIN", "MANAGER", "API_CLIENT"];

      if (!allowedApiKeyRoles.some((role) => roles.includes(role))) {
        return res.status(403).json({
          error: "API key has insufficient permissions",
        });
      }
    } else {
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({
          error: "Insufficient permissions",
        });
      }
    }

    next();
  };
};
