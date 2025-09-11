import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { AccessTokenPayload, RefreshTokenPayload } from "../types/auth";

export class AuthUtils {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload: AccessTokenPayload): string {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not defined");
    }

    const options: SignOptions = {
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || "15m") as any,
    };

    return jwt.sign(payload, secret, options);
  }

  static generateRefreshToken(payload: RefreshTokenPayload): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not defined");
    }

    const options: SignOptions = {
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || "7d") as any,
    };

    return jwt.sign(payload, secret, options);
  }

  static verifyAccessToken(token: string): AccessTokenPayload {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) {
      throw new Error("JWT_ACCESS_SECRET is not defined");
    }
    return jwt.verify(token, secret) as AccessTokenPayload;
  }

  static verifyRefreshToken(token: string): RefreshTokenPayload {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) {
      throw new Error("JWT_REFRESH_SECRET is not defined");
    }
    return jwt.verify(token, secret) as RefreshTokenPayload;
  }

  static generateRandomToken(length: number = 32): string {
    return require("crypto").randomBytes(length).toString("hex");
  }
}
