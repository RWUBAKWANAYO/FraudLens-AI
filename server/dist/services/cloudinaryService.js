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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
// server/src/services/cloudinaryService.ts
const cloudinary_1 = require("cloudinary");
const node_fetch_1 = __importDefault(require("node-fetch"));
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});
class CloudinaryService {
    static uploadBuffer(buffer, fileName, folder) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary_1.v2.uploader.upload_stream({
                    resource_type: "auto",
                    folder: `${process.env.CLOUDINARY_UPLOAD_DIRECTORY}/${folder}`,
                    public_id: fileName.replace(/\.[^/.]+$/, ""),
                    filename_override: fileName,
                    use_filename: true,
                    unique_filename: true,
                    allowed_formats: ["pdf", "doc", "docx", "xls", "xlsx", "csv", "json", "txt"],
                }, (error, result) => {
                    if (error) {
                        reject(error);
                    }
                    else if (result) {
                        resolve({
                            secure_url: result.secure_url,
                            public_id: result.public_id,
                            resource_type: result.resource_type,
                            bytes: result.bytes,
                        });
                    }
                    else {
                        reject(new Error("Upload failed"));
                    }
                });
                const bufferStream = require("stream").PassThrough();
                bufferStream.end(buffer);
                bufferStream.pipe(uploadStream);
            });
        });
    }
    static downloadFileBuffer(publicId_1) {
        return __awaiter(this, arguments, void 0, function* (publicId, resourceType = "raw") {
            var _a, e_1, _b, _c;
            try {
                const signedUrl = cloudinary_1.v2.url(publicId, {
                    resource_type: resourceType,
                    secure: true,
                    sign_url: true,
                    expires_at: Math.floor(Date.now() / 1000) + 300,
                });
                const response = yield (0, node_fetch_1.default)(signedUrl);
                if (!response.ok) {
                    throw new Error(`Cloudinary responded with ${response.status}`);
                }
                if (!response.body) {
                    throw new Error("No response body from Cloudinary");
                }
                const chunks = [];
                try {
                    for (var _d = true, _e = __asyncValues(response.body), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                        _c = _f.value;
                        _d = false;
                        const chunk = _c;
                        chunks.push(chunk);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return Buffer.concat(chunks);
            }
            catch (error) {
                console.error("Cloudinary download error:", error);
                throw new Error("Failed to download file from cloud storage");
            }
        });
    }
    static getFileStream(publicId_1) {
        return __awaiter(this, arguments, void 0, function* (publicId, resourceType = "raw") {
            try {
                const buffer = yield this.downloadFileBuffer(publicId, resourceType);
                const { PassThrough } = require("stream");
                const stream = new PassThrough();
                stream.end(buffer);
                return {
                    stream,
                    contentType: "application/octet-stream",
                    contentLength: buffer.length,
                };
            }
            catch (error) {
                console.error("Cloudinary stream error:", error);
                throw new Error("Failed to retrieve file from cloud storage");
            }
        });
    }
    static deleteFile(publicId_1) {
        return __awaiter(this, arguments, void 0, function* (publicId, resourceType = "raw") {
            try {
                const result = yield cloudinary_1.v2.uploader.destroy(publicId, {
                    resource_type: resourceType,
                });
                return result.result === "ok";
            }
            catch (error) {
                console.error("Error deleting file:", error);
                return false;
            }
        });
    }
    static getFileDirect(publicId_1) {
        return __awaiter(this, arguments, void 0, function* (publicId, resourceType = "raw") {
            try {
                const buffer = yield this.downloadFileBuffer(publicId, resourceType);
                return buffer;
            }
            catch (error) {
                console.error("Cloudinary direct download error:", error);
                throw new Error("Failed to download file from cloud storage");
            }
        });
    }
}
exports.CloudinaryService = CloudinaryService;
