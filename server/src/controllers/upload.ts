import { Request, Response, NextFunction } from "express";
import { processFileUpload } from "../services/uploadProcessor";
import { processJsonData } from "../services/jsonProcessor";
import { ErrorHandler } from "../utils/errorHandler";
import { getUploadsList } from "../services/uploadService";
import { validateUploadFile } from "../utils/uploadUtils";

export async function handleFileUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = (req.user!.companyId as string) || null;
    if (!companyId) {
      return res.status(400).json({ error: "Missing companyId" });
    }

    if (req.body.data) {
      try {
        const result = await processJsonData(
          req.body.data,
          companyId,
          req.body.fileName || "direct-data-upload"
        );
        return res.json(result);
      } catch (error) {
        return res
          .status(400)
          .json({ error: "Invalid JSON data", details: ErrorHandler.getErrorMessage(error) });
      }
    }

    const validationError = validateUploadFile(req.file, req.body.data);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const result = await processFileUpload(req.file!, companyId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
export async function uploadList(req: Request, res: Response, next: NextFunction) {
  try {
    const companyId = req.user!.companyId as string;

    const page = req.query.page ? parseInt(req.query.page as string) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as "asc" | "desc";
    const searchTerm = req.query.search as string;

    const filters = {
      status: req.query.status as string,
      fileType: req.query.fileType as string,
      fileName: req.query.fileName as string,
      createdAtMin: req.query.createdAtMin as string,
      createdAtMax: req.query.createdAtMax as string,
      completedAtMin: req.query.completedAtMin as string,
      completedAtMax: req.query.completedAtMax as string,
    };

    const result = await getUploadsList(companyId, {
      page,
      limit,
      sortBy,
      sortOrder,
      searchTerm,
      filters,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}
