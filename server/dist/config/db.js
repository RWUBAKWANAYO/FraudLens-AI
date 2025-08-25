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
// server/src/config/db.ts
const client_1 = require("@prisma/client");
// Create Prisma client with proper connection configuration
exports.prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn", "info"] : ["error", "warn"],
    // Add connection pool configuration
    datasources: {
        db: {
            // Ensure timeout parameters are included
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
// Database connection health check
function checkDatabaseHealth() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield exports.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            console.error("Database health check failed:", {
                code: error.code,
                message: error.message,
                timestamp: new Date().toISOString(),
            });
            return false;
        }
    });
}
// Enhanced connectDB function with retry logic
const connectDB = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (maxRetries = 3, retryDelay = 2000) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            yield exports.prisma.$connect();
            console.log("✅ TiDB connected successfully");
            // Start periodic health checks
            startDatabaseHealthChecks();
            return;
        }
        catch (error) {
            retries++;
            // Handle specific connection errors
            if (error.code === "P1001" || error.code === "P2024") {
                console.error(`❌ TiDB connection attempt ${retries}/${maxRetries} failed:`, error.message);
            }
            else {
                console.error(`❌ TiDB connection attempt ${retries}/${maxRetries} failed:`, error);
            }
            if (retries >= maxRetries) {
                console.error("Max connection retries reached. Exiting.");
                process.exit(1);
            }
            // Exponential backoff
            const delay = retryDelay * Math.pow(2, retries - 1);
            console.log(`Retrying connection in ${delay}ms...`);
            yield new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
});
exports.connectDB = connectDB;
// Utility function for safe database operations with retry
function withDbRetry(operation_1) {
    return __awaiter(this, arguments, void 0, function* (operation, maxRetries = 3, delayMs = 2000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return yield operation();
            }
            catch (error) {
                if (attempt === maxRetries)
                    throw error;
                // Only retry on connection/timeout errors
                if (error.code === "P1001" || error.code === "P2024") {
                    console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms...`);
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
// Periodic health checks
let healthCheckInterval = null;
function startDatabaseHealthChecks() {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }
    healthCheckInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
        try {
            const isHealthy = yield checkDatabaseHealth();
            if (!isHealthy) {
                console.warn("Database connection health check failed");
            }
        }
        catch (error) {
            console.error("Database health check error:", error);
        }
    }), 30000); // Check every 30 seconds
}
// Graceful shutdown
function disconnectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (healthCheckInterval) {
                clearInterval(healthCheckInterval);
            }
            yield exports.prisma.$disconnect();
            console.log("✅ TiDB disconnected gracefully");
        }
        catch (error) {
            console.error("❌ Error disconnecting from TiDB:", error);
        }
    });
}
// Handle process termination
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGINT received, closing database connections...");
    yield disconnectDB();
    process.exit(0);
}));
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGTERM received, closing database connections...");
    yield disconnectDB();
    process.exit(0);
}));
