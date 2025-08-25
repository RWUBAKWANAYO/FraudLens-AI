// server/src/utils/auth.ts
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { JwtPayload } from "../types/auth";

export class AuthUtils {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: JwtPayload): string {
    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const options: SignOptions = {
      expiresIn: (process.env.JWT_EXPIRES_IN || "30d") as any,
    };

    return jwt.sign(payload, secret, options);
  }

  static verifyToken(token: string): JwtPayload {
    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }
    return jwt.verify(token, secret) as JwtPayload;
  }

  static generateRandomToken(length: number = 32): string {
    return require("crypto").randomBytes(length).toString("hex");
  }
}
