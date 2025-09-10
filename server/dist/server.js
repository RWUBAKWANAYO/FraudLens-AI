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
const connectionManager_1 = require("./queue/connectionManager");
const server = http_1.default.createServer(app_1.default);
const PORT = process.env.PORT || 8080;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.PUBLIC_WS_ORIGIN,
        methods: ["GET", "POST"],
        credentials: true,
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true,
    },
});
socketService_1.socketService.initialize(io);
process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
});
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
function gracefulShutdown() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Shutting down gracefully...");
        try {
            server.close(() => {
                console.log("HTTP server closed");
            });
            yield (0, redis_1.closeRedisConnections)();
            yield (0, connectionManager_1.closeConnections)();
            console.log("All connections closed, exiting process");
            process.exit(0);
        }
        catch (error) {
            console.error("Error during shutdown:", error);
            process.exit(1);
        }
    });
}
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
process.on("exit", (code) => {
    console.log(`Process exited with code: ${code}`);
});
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, db_1.connectDB)();
            server.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
                console.log(`Socket.IO enabled with CORS origin: ${process.env.PUBLIC_WS_ORIGIN}`);
            });
            server.on("error", (error) => {
                console.error("Server error:", error);
            });
        }
        catch (error) {
            console.error("Failed to start server:", error);
            process.exit(1);
        }
    });
}
startServer().catch(console.error);
