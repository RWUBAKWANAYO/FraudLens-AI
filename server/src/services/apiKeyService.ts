import { prisma } from "../config/db";
import { createHmac } from "crypto";
import { v4 as uuidv4 } from "uuid";

export class ApiKeyService {
  private static readonly SALT = process.env.API_KEY_SECRET_SALT || "default-salt";
  private static readonly MAX_KEYS = parseInt(process.env.MAX_API_KEYS_PER_COMPANY || "10");

  static async createApiKey(
    companyId: string,
    userId: string,
    name: string,
    expiresInDays?: number
  ) {
    const existingActiveKeys = await prisma.apiKey.count({
      where: { companyId, enabled: true },
    });

    if (existingActiveKeys >= this.MAX_KEYS) {
      throw new Error(`Maximum of ${this.MAX_KEYS} active API keys allowed`);
    }

    const key = `ak_${uuidv4().replace(/-/g, "")}`;
    const secret = uuidv4().replace(/-/g, "");
    const hashedSecret = this.hashSecret(secret);

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        companyId,
        name,
        key,
        secret: hashedSecret,
        expiresAt,
        createdBy: userId,
        enabled: true,
      },
    });

    return { apiKey, secret };
  }

  static async listApiKeys(companyId: string) {
    return prisma.apiKey.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async revokeApiKey(id: string, companyId: string) {
    const result = await prisma.apiKey.updateMany({
      where: { id, companyId, enabled: true },
      data: { enabled: false, lastUsedAt: new Date() },
    });

    if (result.count === 0) {
      throw new Error("API key not found or already revoked");
    }
  }

  static async reactivateApiKey(id: string, companyId: string) {
    const existingActiveKeys = await prisma.apiKey.count({
      where: { companyId, enabled: true },
    });

    if (existingActiveKeys >= this.MAX_KEYS) {
      throw new Error(`Maximum of ${this.MAX_KEYS} active API keys allowed`);
    }

    const result = await prisma.apiKey.updateMany({
      where: { id, companyId, enabled: false },
      data: { enabled: true },
    });

    if (result.count === 0) {
      throw new Error("API key not found or already active");
    }
  }

  static async rotateApiKeySecret(id: string, companyId: string) {
    const newSecret = uuidv4().replace(/-/g, "");
    const hashedSecret = this.hashSecret(newSecret);

    const result = await prisma.apiKey.updateMany({
      where: { id, companyId, enabled: true },
      data: { secret: hashedSecret, lastUsedAt: new Date() },
    });

    if (result.count === 0) {
      throw new Error("API key not found or revoked");
    }

    return newSecret;
  }

  static async getApiKeyDetails(id: string, companyId: string) {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        key: true,
        enabled: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    if (!apiKey) {
      throw new Error("API key not found");
    }

    return apiKey;
  }

  static async deleteApiKey(id: string, companyId: string) {
    const result = await prisma.apiKey.deleteMany({
      where: { id, companyId },
    });

    if (result.count === 0) {
      throw new Error("API key not found");
    }
  }

  static hashSecret(secret: string): string {
    return createHmac("sha256", this.SALT).update(secret).digest("hex");
  }
}
