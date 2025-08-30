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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = exports.prisma = void 0;
exports.checkDatabaseHealth = checkDatabaseHealth;
exports.withDbRetry = withDbRetry;
exports.disconnectDB = disconnectDB;
const client_1 = require("@prisma/client");
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn", "info"] : ["error", "warn"],
    datasources: {
        db: {
            url: process.env.DATABASE_URL +
                (((_a = process.env.DATABASE_URL) === null || _a === void 0 ? void 0 : _a.includes("?")) ? "&" : "?") +
                "connection_limit=" +
                (process.env.DB_CONNECTION_LIMIT || "10") +
                "&pool_timeout=" +
                (process.env.DB_POOL_TIMEOUT || "30") +
                "&acquire_timeout=" +
                (process.env.DB_ACQUIRE_TIMEOUT || "60000") +
                "&connect_timeout=60" +
                "&socket_timeout=60" +
                "&transaction_isolation=REPEATABLE_READ",
        },
    },
});
function checkDatabaseHealth() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            return false;
        }
    });
}
const connectDB = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (maxRetries = 3, retryDelay = 2000) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            yield exports.prisma.$connect();
            startDatabaseHealthChecks();
            return;
        }
        catch (error) {
            retries++;
            if (retries >= maxRetries) {
                process.exit(1);
            }
            const delay = retryDelay * Math.pow(2, retries - 1);
            yield new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
});
exports.connectDB = connectDB;
function withDbRetry(operation_1) {
    return __awaiter(this, arguments, void 0, function* (operation, maxRetries = 3, delayMs = 2000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return yield operation();
            }
            catch (error) {
                if (attempt === maxRetries)
                    throw error;
                if (error.code === "P1001" || error.code === "P2024") {
                    yield new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
                }
                else {
                    throw error;
                }
            }
        }
        throw new Error("Max retries reached");
    });
}
let healthCheckInterval = null;
function startDatabaseHealthChecks() {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
    healthCheckInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
        try {
            yield checkDatabaseHealth();
        }
        catch (error) { }
    }), 30000);
}
function disconnectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
            }
            yield exports.prisma.$disconnect();
        }
        catch (error) { }
    });
}
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    yield disconnectDB();
    process.exit(0);
}));
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    yield disconnectDB();
    process.exit(0);
}));
