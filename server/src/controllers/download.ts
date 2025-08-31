import { Request, Response, NextFunction } from "express";
import { DownloadService } from "../services/downloadService";

export async function downloadUpload(req: Request, res: Response, next: NextFunction) {
  try {
    const { uploadId } = req.params;
    const companyId = req.user!.companyId as string;

    if (!uploadId) {
      return res.status(400).json({ error: "Upload ID is required" });
    }

    const downloadResult = await DownloadService.getUploadForDownload(uploadId, companyId);

    res.setHeader("Content-Type", downloadResult.fileType || "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${downloadResult.fileName}"`);
    res.setHeader("Content-Length", downloadResult.fileSize.toString());
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    res.send(downloadResult.buffer);
  } catch (error) {
    console.error("Download error:", error);

    if (!res.headersSent) {
      if (error instanceof Error) {
        if (error.message === "Upload not found") {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === "File not available for download") {
          return res.status(404).json({ error: error.message });
        }
      }
      next(error);
    }
  }
}

export async function getUploadInfo(req: Request, res: Response, next: NextFunction) {
  try {
    const { uploadId } = req.params;
    const companyId = req.user!.companyId as string;

    if (!uploadId) {
      return res.status(400).json({ error: "Upload ID is required" });
    }

    const uploadInfo = await DownloadService.getUploadInfo(uploadId, companyId);
    res.json(uploadInfo);
  } catch (error) {
    console.error("Get upload info error:", error);

    if (error instanceof Error && error.message === "Upload not found") {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
}
