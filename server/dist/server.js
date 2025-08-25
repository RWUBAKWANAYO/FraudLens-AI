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
const app_1 = __importDefault(require("./app"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const db_1 = require("./config/db");
const socketService_1 = require("./services/socketService");
const redis_1 = require("./config/redis");
const connectionManager_1 = require("./queue/connectionManager"); // Import RabbitMQ close function
const server = http_1.default.createServer(app_1.default);
const PORT = process.env.PORT || 8080;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.PUBLIC_WS_ORIGIN || "*",
        methods: ["GET", "POST"],
        credentials: true,
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
    },
});
// Initialize socket service
socketService_1.socketService.initialize(io);
// ==================== GLOBAL ERROR HANDLERS ====================
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    // Don't exit immediately for uncaught exceptions related to connections
    // Let the reconnection logic handle it
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // You might want to exit here for unhandled rejections as they're more serious
    // process.exit(1);
});
// Global promise rejection handler (Node.js 15+)
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    // Application specific logging, throwing an error, or other logic here
});
// ==================== GRACEFUL SHUTDOWN ====================
function gracefulShutdown() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Shutting down gracefully...");
        try {
            // Close HTTP server
            server.close(() => {
                console.log("HTTP server closed");
            });
            // Close all connections
            yield (0, redis_1.closeRedisConnections)();
            yield (0, connectionManager_1.closeConnections)();
            // Add any other cleanup here (database, etc.)
            console.log("All connections closed, exiting process");
            process.exit(0);
        }
        catch (error) {
            console.error("Error during shutdown:", error);
            process.exit(1);
        }
    });
}
// Handle graceful shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
// Handle other process events
process.on("exit", (code) => {
    console.log(`Process exited with code: ${code}`);
});
// ==================== SERVER STARTUP ====================
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, db_1.connectDB)();
            server.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
                console.log(`Socket.IO enabled with CORS origin: ${process.env.PUBLIC_WS_ORIGIN}`);
            });
            // Handle server errors
            server.on("error", (error) => {
                console.error("Server error:", error);
                // You might want to restart the server or handle specific errors
            });
        }
        catch (error) {
            console.error("Failed to start server:", error);
            process.exit(1);
        }
    });
}
startServer().catch(console.error);
