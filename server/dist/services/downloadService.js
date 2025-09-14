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
exports.DownloadService = void 0;
const db_1 = require("../config/db");
const cloudinaryService_1 = require("./cloudinaryService");
class DownloadService {
    static validateUploadAccess(uploadId, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                throw new Error("Upload not found");
            }
            if (!upload.publicId) {
                throw new Error("File not available for download");
            }
            return upload;
        });
    }
    static getUploadForDownload(uploadId, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
            const upload = yield this.validateUploadAccess(uploadId, companyId);
            const fileBuffer = yield cloudinaryService_1.CloudinaryService.getFileDirect(upload.publicId, upload.resourceType || "raw");
            if (upload.fileSize && fileBuffer.length !== upload.fileSize) {
                console.warn(`File size mismatch for ${uploadId}: expected ${upload.fileSize}, got ${fileBuffer.length}`);
            }
            return {
                buffer: fileBuffer,
                fileName: upload.fileName,
                fileType: upload.fileType,
                fileSize: fileBuffer.length,
            };
        });
    }
    static getUploadInfo(uploadId, companyId) {
        return __awaiter(this, void 0, void 0, function* () {
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
                throw new Error("Upload not found");
            }
            return Object.assign(Object.assign({}, upload), { canDownload: !!upload.publicId, downloadUrl: upload.publicId ? `/api/uploads/download/${upload.id}` : null });
        });
    }
}
exports.DownloadService = DownloadService;
