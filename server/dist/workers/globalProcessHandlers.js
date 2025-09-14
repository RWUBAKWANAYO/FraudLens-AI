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
const connectionManager_1 = require("../queue/connectionManager");
const redis_1 = require("../config/redis");
function safeShutdown() {
    return __awaiter(this, arguments, void 0, function* (code = 1, reason) {
        try {
            console.error("Shutting down due to:", reason || "unknown");
            yield Promise.allSettled([(0, connectionManager_1.gracefulShutdown)(), (0, redis_1.closeRedisConnections)()]);
        }
        catch (err) {
            console.error("Error during graceful shutdown:", err);
        }
        finally {
            process.exit(code);
        }
    });
}
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled Rejection at:", reason);
    safeShutdown(1, `unhandledRejection: ${String(reason)}`);
});
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    safeShutdown(1, `uncaughtException: ${err && err.message}`);
});
process.once("SIGUSR2", () => {
    safeShutdown(0, "SIGUSR2");
});
