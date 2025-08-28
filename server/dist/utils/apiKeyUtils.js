"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyUtils = void 0;
const crypto_1 = require("crypto");
class ApiKeyUtils {
    static validateApiKeyFormat(credentials) {
        const [key, secret] = credentials.split(":");
        if (!key || !secret) {
            throw new Error("Invalid API key format. Use: key:secret");
        }
        return { key, secret };
    }
    static hashSecret(secret, salt) {
        return (0, crypto_1.createHmac)("sha256", salt).update(secret).digest("hex");
    }
    static generateApiKey() {
        const key = `ak_${this.generateRandomString()}`;
        const secret = this.generateRandomString();
        return { key, secret };
    }
    static generateRandomString() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
}
exports.ApiKeyUtils = ApiKeyUtils;
