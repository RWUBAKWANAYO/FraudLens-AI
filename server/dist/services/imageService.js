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
exports.ImageService = void 0;
const cloudinaryService_1 = require("./cloudinaryService");
class ImageService {
    static uploadImage(buffer, fileName, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                if (buffer.length > 2 * 1024 * 1024) {
                    throw new Error("Image size must be less than 2MB");
                }
                const fileExtension = (_a = fileName.split(".").pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase();
                if (!["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension || "")) {
                    throw new Error("Invalid image format. Allowed: JPG, PNG, GIF, WEBP");
                }
                const result = yield cloudinaryService_1.CloudinaryService.uploadImage(buffer, fileName, `images/${userId}`);
                return {
                    url: result.secure_url,
                    publicId: result.public_id,
                    size: result.bytes,
                };
            }
            catch (error) {
                console.error("Imageupload error:", error);
                throw new Error("Failed to upload image");
            }
        });
    }
}
exports.ImageService = ImageService;
