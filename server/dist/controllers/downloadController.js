"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadUpload = downloadUpload;
exports.downloadUploadSimple = downloadUploadSimple;
exports.getUploadInfo = getUploadInfo;
const db_1 = require("../config/db");
const cloudinaryService_1 = require("../services/cloudinaryService");
function downloadUpload(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { uploadId } = req.params;
            const companyId = req.user.companyId;
            if (!uploadId) {
                return res.status(400).json({ error: "Upload ID is required" });
            }
            const upload = yield db_1.prisma.upload.findFirst({
                where: { id: uploadId, companyId },
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    publicId: true,
                    resourceType: true,
                    fileSize: true,
                },
            });
            if (!upload) {
                return res.status(404).json({ error: "Upload not found" });
            }
            if (!upload.publicId) {
                return res.status(404).json({ error: "File not available for download" });
            }
            // METHOD 1: Direct buffer download (most reliable)
            try {
                const fileBuffer = yield cloudinaryService_1.CloudinaryService.getFileDirect(upload.publicId, upload.resourceType || "raw");
                // Set appropriate headers
                res.setHeader("Content-Type", upload.fileType || "application/octet-stream");
                res.setHeader("Content-Disposition", `attachment; filename="${upload.fileName}"`);
                res.setHeader("Content-Length", fileBuffer.length.toString());
                res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                res.setHeader("Pragma", "no-cache");
                res.setHeader("Expires", "0");
                // Send the buffer directly
                res.send(fileBuffer);
            }
            catch (directError) {
                console.warn("Direct download failed, falling back to stream:", directError);
                // METHOD 2: Fallback to streaming
                try {
                    const { stream, contentType, contentLength } = yield cloudinaryService_1.CloudinaryService.getFileStream(upload.publicId, upload.resourceType || "raw");
                    res.setHeader("Content-Type", contentType);
                    res.setHeader("Content-Disposition", `attachment; filename="${upload.fileName}"`);
                    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
                    res.setHeader("Pragma", "no-cache");
                    res.setHeader("Expires", "0");
                    if (contentLength) {
                        res.setHeader("Content-Length", contentLength);
                    }
                    else if (upload.fileSize) {
                        res.setHeader("Content-Length", upload.fileSize.toString());
                    }
                    // Handle stream events to ensure complete transfer
                    stream.on("error", (error) => {
                        console.error("Stream error:", error);
                        if (!res.headersSent) {
                            res.status(500).json({ error: "Download failed" });
                        }
                    });
                    stream.on("end", () => {
                        console.log("Stream completed successfully");
                    });
                    stream.pipe(res);
                }
                catch (streamError) {
                    console.error("Stream download also failed:", streamError);
                    throw new Error("Both download methods failed");
                }
            }
        }
        catch (error) {
            console.error("Download error:", error);
            // Only send error if headers haven't been sent yet
            if (!res.headersSent) {
                next(error);
            }
        }
    });
}
// Alternative: Simple buffer download (recommended)
function downloadUploadSimple(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { uploadId } = req.params;
            const companyId = req.user.companyId;
            if (!uploadId) {
                return res.status(400).json({ error: "Upload ID is required" });
            }
            const upload = yield db_1.prisma.upload.findFirst({
                where: { id: uploadId, companyId },
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    publicId: true,
                    resourceType: true,
                    fileSize: true,
                },
            });
            if (!upload) {
                return res.status(404).json({ error: "Upload not found" });
            }
            if (!upload.publicId) {
                return res.status(404).json({ error: "File not available for download" });
            }
            // Download the complete file as buffer first
            const fileBuffer = yield cloudinaryService_1.CloudinaryService.getFileDirect(upload.publicId, upload.resourceType || "raw");
            // Verify the buffer is complete
            if (upload.fileSize && fileBuffer.length !== upload.fileSize) {
                console.warn(`File size mismatch: expected ${upload.fileSize}, got ${fileBuffer.length}`);
            }
            // Set headers
            res.setHeader("Content-Type", upload.fileType || "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${upload.fileName}"`);
            res.setHeader("Content-Length", fileBuffer.length.toString());
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
            // Send the complete file
            res.send(fileBuffer);
        }
        catch (error) {
            console.error("Download error:", error);
            if (!res.headersSent) {
                next(error);
            }
        }
    });
}
function getUploadInfo(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { uploadId } = req.params;
            const companyId = req.user.companyId;
            const upload = yield db_1.prisma.upload.findFirst({
                where: { id: uploadId, companyId },
                select: {
                    id: true,
                    fileName: true,
                    fileType: true,
                    fileSize: true,
                    status: true,
                    createdAt: true,
                    completedAt: true,
                    publicId: true,
                    _count: {
                        select: {
                            records: true,
                            threats: true,
                        },
                    },
                },
            });
            if (!upload) {
                return res.status(404).json({ error: "Upload not found" });
            }
            res.json(Object.assign(Object.assign({}, upload), { canDownload: !!upload.publicId, downloadUrl: upload.publicId ? `/api/uploads/download/${upload.id}` : null }));
        }
        catch (error) {
            next(error);
        }
    });
}
