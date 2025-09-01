import { v2 as cloudinary } from "cloudinary";
import fetch from "node-fetch";

interface ICloudinaryResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
  bytes: number;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export class CloudinaryService {
  static async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    folder: string
  ): Promise<ICloudinaryResponse> {
    return new Promise((resolve, reject) => {
      const fileExtension = fileName.split(".").pop();
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      const uniqueId = crypto.randomUUID();
      const uniquePublicId = `${baseName}_${uniqueId}${fileExtension ? `.${fileExtension}` : ""}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto",
          folder: `${process.env.CLOUDINARY_UPLOAD_DIRECTORY}/${folder}`,
          public_id: uniquePublicId,
          filename_override: fileName,
          use_filename: false,
          unique_filename: true,
          allowed_formats: ["pdf", "doc", "docx", "xls", "xlsx", "csv", "json", "txt"],
          timeout: 30000,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            reject(error);
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              resource_type: result.resource_type,
              bytes: result.bytes,
            });
          } else {
            reject(new Error("Upload failed with no error or result"));
          }
        }
      );
      uploadStream.on("error", (error) => {
        console.error("Cloudinary stream error:", error);
        reject(error);
      });

      const bufferStream = require("stream").PassThrough();
      bufferStream.end(buffer);
      bufferStream.pipe(uploadStream);
    });
  }

  static async downloadFileBuffer(publicId: string, resourceType: string = "raw"): Promise<Buffer> {
    try {
      const signedUrl = cloudinary.url(publicId, {
        resource_type: resourceType,
        secure: true,
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 300,
      });

      const response = await fetch(signedUrl);

      if (!response.ok) {
        throw new Error(`Cloudinary responded with ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body from Cloudinary");
      }

      const chunks: Buffer[] = [];
      for await (const chunk of response.body) {
        chunks.push(chunk as Buffer);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error("Cloudinary download error:", error);
      throw new Error("Failed to download file from cloud storage");
    }
  }

  static async getFileStream(publicId: string, resourceType: string = "raw") {
    try {
      const buffer = await this.downloadFileBuffer(publicId, resourceType);

      const { PassThrough } = require("stream");
      const stream = new PassThrough();
      stream.end(buffer);

      return {
        stream,
        contentType: "application/octet-stream",
        contentLength: buffer.length,
      };
    } catch (error) {
      console.error("Cloudinary stream error:", error);
      throw new Error("Failed to retrieve file from cloud storage");
    }
  }

  static async deleteFile(publicId: string, resourceType: string = "raw"): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === "ok";
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }

  static async getFileDirect(publicId: string, resourceType: string = "raw") {
    try {
      const buffer = await this.downloadFileBuffer(publicId, resourceType);
      return buffer;
    } catch (error) {
      console.error("Cloudinary direct download error:", error);
      throw new Error("Failed to download file from cloud storage");
    }
  }
}
