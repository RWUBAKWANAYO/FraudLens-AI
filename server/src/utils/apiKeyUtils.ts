import { createHmac } from "crypto";

export class ApiKeyUtils {
  static validateApiKeyFormat(credentials: string): { key: string; secret: string } {
    const [key, secret] = credentials.split(":");

    if (!key || !secret) {
      throw new Error("Invalid API key format. Use: key:secret");
    }

    return { key, secret };
  }

  static hashSecret(secret: string, salt: string): string {
    return createHmac("sha256", salt).update(secret).digest("hex");
  }

  static generateApiKey(): { key: string; secret: string } {
    const key = `ak_${this.generateRandomString()}`;
    const secret = this.generateRandomString();
    return { key, secret };
  }

  private static generateRandomString(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
