import { CloudinaryService } from "./cloudinaryService";

export interface ImageUploadResult {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  size: number;
  format?: string;
}

export class ImageService {
  static async uploadImage(
    buffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<ImageUploadResult> {
    try {
      if (buffer.length > 2 * 1024 * 1024) {
        throw new Error("Image size must be less than 2MB");
      }

      const fileExtension = fileName.split(".").pop()?.toLowerCase();
      if (!["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension || "")) {
        throw new Error("Invalid image format. Allowed: JPG, PNG, GIF, WEBP");
      }

      const result = await CloudinaryService.uploadImage(buffer, fileName, `images/${userId}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        size: result.bytes,
      };
    } catch (error) {
      console.error("Imageupload error:", error);
      throw new Error("Failed to upload image");
    }
  }
}
