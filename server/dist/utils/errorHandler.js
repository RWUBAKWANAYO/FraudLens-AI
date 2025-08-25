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
exports.ErrorHandler = void 0;
exports.handleError = handleError;
exports.safeTry = safeTry;
// utils/errorHandler.ts
const error_1 = require("../types/error");
class ErrorHandler {
    static getErrorMessage(error) {
        if ((0, error_1.isAppError)(error)) {
            return error.message;
        }
        if (typeof error === "string") {
            return error;
        }
        if (error && typeof error === "object" && "message" in error) {
            return String(error.message);
        }
        return "An unknown error occurred";
    }
    static getErrorCode(error) {
        if ((0, error_1.isAppError)(error) && error.code) {
            return error.code;
        }
        if (error && typeof error === "object" && "code" in error) {
            return String(error.code);
        }
        return undefined;
    }
    static getStatusCode(error) {
        if ((0, error_1.isHttpError)(error)) {
            return error.statusCode;
        }
        if (error && typeof error === "object" && "statusCode" in error) {
            return Number(error.statusCode);
        }
        if (error && typeof error === "object" && "status" in error) {
            return Number(error.status);
        }
        return undefined;
    }
    static isRetryable(error) {
        // Network errors (timeouts, connection resets)
        if ((0, error_1.isNetworkError)(error)) {
            return true;
        }
        // HTTP 5xx errors (server errors)
        const statusCode = this.getStatusCode(error);
        if (statusCode && statusCode >= 500 && statusCode < 600) {
            return true;
        }
        // HTTP 429 (rate limiting)
        if (statusCode === 429) {
            return true;
        }
        // Database connection errors
        if ((0, error_1.isDatabaseError)(error)) {
            const retryableCodes = [
                "ECONNRESET",
                "ETIMEDOUT",
                "PROTOCOL_CONNECTION_LOST",
                "ER_LOCK_DEADLOCK",
                "ER_LOCK_WAIT_TIMEOUT",
            ];
            return retryableCodes.includes(error.code || "");
        }
        return false;
    }
    static logError(error, context = "Application") {
        const message = this.getErrorMessage(error);
        const code = this.getErrorCode(error);
        const statusCode = this.getStatusCode(error);
        console.error(`[${context}] Error:`, {
            message,
            code,
            statusCode,
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined,
        });
    }
    static toAppError(error) {
        if ((0, error_1.isAppError)(error)) {
            return error;
        }
        return (0, error_1.createAppError)(this.getErrorMessage(error), {
            cause: error,
            details: error,
        });
    }
    static formatForResponse(error) {
        const appError = this.toAppError(error);
        return {
            error: appError.message,
            code: appError.code,
            statusCode: appError.statusCode,
            details: process.env.NODE_ENV === "development" ? appError.details : undefined,
        };
    }
}
exports.ErrorHandler = ErrorHandler;
// Global error handling function
function handleError(error, context) {
    ErrorHandler.logError(error, context);
    throw ErrorHandler.toAppError(error);
}
// Safe try-catch wrapper
function safeTry(operation, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const data = yield operation();
            return { data, error: null };
        }
        catch (error) {
            const appError = ErrorHandler.toAppError(error);
            ErrorHandler.logError(appError, context);
            return { data: null, error: appError };
        }
    });
}
