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
exports.handleFileUpload = handleFileUpload;
const uploadProcessor_1 = require("../services/uploadProcessor");
function handleFileUpload(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!req.file) {
                return res.status(400).json({ error: "No file uploaded" });
            }
            const companyId = req.user.companyId || null;
            if (!companyId) {
                return res.status(400).json({ error: "Missing companyId" });
            }
            const result = yield (0, uploadProcessor_1.processUpload)(req.file, companyId);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    });
}
