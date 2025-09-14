"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookTimeoutError = exports.WebhookValidationError = exports.WebhookError = void 0;
exports.isAppError = isAppError;
exports.isHttpError = isHttpError;
exports.isDatabaseError = isDatabaseError;
exports.isValidationError = isValidationError;
exports.isNetworkError = isNetworkError;
exports.createAppError = createAppError;
exports.createHttpError = createHttpError;
// Type guards
function isAppError(error) {
    return error instanceof Error;
}
function isHttpError(error) {
    return isAppError(error) && "statusCode" in error && typeof error.statusCode === "number";
}
function isDatabaseError(error) {
    return isAppError(error) && "code" in error && typeof error.code === "string";
}
function isValidationError(error) {
    return isAppError(error) && "fieldErrors" in error;
}
function isNetworkError(error) {
    return isAppError(error) && ("url" in error || "method" in error);
}
// Error creation utilities
function createAppError(message, options = {}) {
    const error = new Error(message);
    error.name = "AppError";
    error.code = options.code;
    error.statusCode = options.statusCode;
    error.details = options.details;
    error.timestamp = new Date().toISOString();
    if (options.cause && options.cause instanceof Error) {
        error.cause = options.cause;
    }
    return error;
}
function createHttpError(message, statusCode, options = {}) {
    const error = createAppError(message, Object.assign(Object.assign({}, options), { statusCode }));
    error.name = "HttpError";
    error.response = options.response;
    return error;
}
class WebhookError extends Error {
    constructor(message, code, statusCode = 500, retryable = true) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.name = "WebhookError";
    }
}
exports.WebhookError = WebhookError;
class WebhookValidationError extends WebhookError {
    constructor(message) {
        super(message, "WEBHOOK_VALIDATION_ERROR", 400, false);
    }
}
exports.WebhookValidationError = WebhookValidationError;
class WebhookTimeoutError extends WebhookError {
    constructor(message) {
        super(message, "WEBHOOK_TIMEOUT_ERROR", 504, true);
    }
}
exports.WebhookTimeoutError = WebhookTimeoutError;
