"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
// server/src/auth/logger.ts
class Logger {
    static info(message, meta) {
        console.log(JSON.stringify(Object.assign({ level: "info", timestamp: new Date().toISOString(), message }, meta)));
    }
    static error(message, error, meta) {
        console.error(JSON.stringify(Object.assign({ level: "error", timestamp: new Date().toISOString(), message, error: (error === null || error === void 0 ? void 0 : error.message) || error, stack: error === null || error === void 0 ? void 0 : error.stack }, meta)));
    }
    static warn(message, meta) {
        console.warn(JSON.stringify(Object.assign({ level: "warn", timestamp: new Date().toISOString(), message }, meta)));
    }
}
exports.Logger = Logger;
