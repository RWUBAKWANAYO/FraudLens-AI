import { Request, Response, NextFunction } from "express";
import { processUpload } from "../services/uploadProcessor";

export async function handleFileUpload(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const companyId = (req.user!.companyId as string) || null;
    if (!companyId) {
      return res.status(400).json({ error: "Missing companyId" });
    }

    const result = await processUpload(req.file, companyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
