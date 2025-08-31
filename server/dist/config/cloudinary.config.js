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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloudinaryFilesDelete = exports.cloudinaryFileDelete = exports.cloudinaryFilesUpload = exports.cloudinaryFileUpload = void 0;
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
// logical functions
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const cloudinaryFileUpload = (filePath, folder) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield cloudinary_1.v2.uploader.upload(filePath, {
            folder: `${process.env.CLOUDINARY_UPLOAD_DIRECTORY}/${folder}`,
        });
        // Delete the local file after uploading
        fs_1.default.unlinkSync(filePath);
        return {
            url: result.url,
            public_id: result.public_id,
        };
    }
    catch (error) {
        console.error("Error uploading image:", error);
    }
});
exports.cloudinaryFileUpload = cloudinaryFileUpload;
const cloudinaryFilesUpload = (files, folder) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const uploadPromises = files.map((file) => (0, exports.cloudinaryFileUpload)(file.path, folder));
        const results = yield Promise.all(uploadPromises);
        return results.filter((url) => url !== undefined);
    }
    catch (error) {
        console.error("Error uploading images:", error);
    }
});
exports.cloudinaryFilesUpload = cloudinaryFilesUpload;
const cloudinaryFileDelete = (publicId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield cloudinary_1.v2.uploader.destroy(publicId);
        if (result.result === "ok")
            return true;
    }
    catch (error) {
        console.error("Error deleting image:", error);
    }
});
exports.cloudinaryFileDelete = cloudinaryFileDelete;
const cloudinaryFilesDelete = (publicIds) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletePromises = publicIds.map((id) => (0, exports.cloudinaryFileDelete)(id));
        const results = yield Promise.all(deletePromises);
        return results.map((res) => res === true);
    }
    catch (error) {
        console.error("Error deleting images:", error);
        return [];
    }
});
exports.cloudinaryFilesDelete = cloudinaryFilesDelete;
