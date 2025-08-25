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
exports.AuthUtils = void 0;
// server/src/utils/auth.ts
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class AuthUtils {
    static hashPassword(password) {
        return __awaiter(this, void 0, void 0, function* () {
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || "12");
            return bcrypt_1.default.hash(password, saltRounds);
        });
    }
    static comparePassword(password, hash) {
        return __awaiter(this, void 0, void 0, function* () {
            return bcrypt_1.default.compare(password, hash);
        });
    }
    static generateToken(payload) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not defined");
        }
        const options = {
            expiresIn: (process.env.JWT_EXPIRES_IN || "30d"),
        };
        return jsonwebtoken_1.default.sign(payload, secret, options);
    }
    static verifyToken(token) {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            throw new Error("JWT_SECRET is not defined");
        }
        return jsonwebtoken_1.default.verify(token, secret);
    }
    static generateRandomToken(length = 32) {
        return require("crypto").randomBytes(length).toString("hex");
    }
}
exports.AuthUtils = AuthUtils;
