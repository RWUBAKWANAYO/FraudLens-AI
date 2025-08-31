import { prisma } from "../config/db";
import { CloudinaryService } from "./cloudinaryService";

export interface DownloadResult {
  buffer: Buffer;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export class DownloadService {
  static async validateUploadAccess(uploadId: string, companyId: string) {
    const upload = await prisma.upload.findFirst({
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
  }

  static async getUploadForDownload(uploadId: string, companyId: string): Promise<DownloadResult> {
    const upload = await this.validateUploadAccess(uploadId, companyId);

    const fileBuffer = await CloudinaryService.getFileDirect(
      upload.publicId!,
      upload.resourceType || "raw"
    );

    if (upload.fileSize && fileBuffer.length !== upload.fileSize) {
      console.warn(
        `File size mismatch for ${uploadId}: expected ${upload.fileSize}, got ${fileBuffer.length}`
      );
    }

    return {
      buffer: fileBuffer,
      fileName: upload.fileName,
      fileType: upload.fileType!,
      fileSize: fileBuffer.length,
    };
  }

  static async getUploadInfo(uploadId: string, companyId: string) {
    const upload = await prisma.upload.findFirst({
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

    return {
      ...upload,
      canDownload: !!upload.publicId,
      downloadUrl: upload.publicId ? `/api/uploads/download/${upload.id}` : null,
    };
  }
}
