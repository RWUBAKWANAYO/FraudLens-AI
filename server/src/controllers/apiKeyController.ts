import { Request, Response } from "express";
import { ApiKeyService } from "../services/apiKeyService";

export class ApiKeyController {
  static async createApiKey(req: Request, res: Response) {
    try {
      const { name, expiresInDays } = req.body;
      const companyId = req.user!.companyId;
      const userId = req.user!.id;

      const { apiKey, secret } = await ApiKeyService.createApiKey(
        companyId,
        userId,
        name,
        expiresInDays
      );

      res.status(201).json({
        id: apiKey.id,
        key: apiKey.key,
        secret,
        name: apiKey.name,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        enabled: apiKey.enabled,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async listApiKeys(req: Request, res: Response) {
    try {
      const companyId = req.user!.companyId;
      const apiKeys = await ApiKeyService.listApiKeys(companyId);
      res.json(apiKeys);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async revokeApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      await ApiKeyService.revokeApiKey(id, companyId);

      res.json({
        message: "API key revoked successfully",
        revokedAt: new Date(),
      });
    } catch (error: any) {
      const status = error.message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }

  static async reactivateApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      await ApiKeyService.reactivateApiKey(id, companyId);

      res.json({
        message: "API key reactivated successfully",
        reactivatedAt: new Date(),
      });
    } catch (error: any) {
      const status = error.message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }

  static async rotateApiKeySecret(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const newSecret = await ApiKeyService.rotateApiKeySecret(id, companyId);

      res.json({
        message: "API key secret rotated successfully",
        secret: newSecret,
        rotatedAt: new Date(),
      });
    } catch (error: any) {
      const status = error.message.includes("not found") ? 404 : 400;
      res.status(status).json({ error: error.message });
    }
  }

  static async getApiKeyDetails(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const apiKey = await ApiKeyService.getApiKeyDetails(id, companyId);
      res.json(apiKey);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  static async deleteApiKey(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      await ApiKeyService.deleteApiKey(id, companyId);

      res.json({
        message: "API key permanently deleted successfully",
        deletedAt: new Date(),
      });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }
}
