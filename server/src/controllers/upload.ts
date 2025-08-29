import { Request, Response, NextFunction } from "express";
import { processUpload } from "../services/uploadProcessor";
import { processJsonData } from "../services/jsonProcessor";
import { ErrorHandler } from "../utils/errorHandler";

export async function handleFileUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = (req.user!.companyId as string) || null;
    if (!companyId) {
      return res.status(400).json({ error: "Missing companyId" });
    }

    if (req.body.jsonData) {
      try {
        const jsonData =
          typeof req.body.jsonData === "string" ? JSON.parse(req.body.jsonData) : req.body.jsonData;

        const result = await processJsonData(
          jsonData,
          companyId,
          req.body.fileName || "direct-upload.json"
        );
        return res.json(result);
      } catch (jsonError) {
        return res
          .status(400)
          .json({ error: "Invalid JSON data", details: ErrorHandler.getErrorMessage(jsonError) });
      }
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await processUpload(req.file, companyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
