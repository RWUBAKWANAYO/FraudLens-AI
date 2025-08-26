"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.getChannel = getChannel;
exports.closeConnections = closeConnections;
exports.checkConnectionHealth = checkConnectionHealth;
exports.gracefulShutdown = gracefulShutdown;
// server/src/queue/connectionManager.ts
const amqp = __importStar(require("amqplib"));
let conn = null;
let ch = null;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;
// Add this flag to prevent reconnection during shutdown
let isShuttingDown = false;
// Connection state monitoring
let connectionState = "disconnected";
function getChannel() {
    return __awaiter(this, void 0, void 0, function* () {
        if (ch && connectionState === "connected") {
            return ch;
        }
        if (isConnecting) {
            // Wait for ongoing connection attempt
            yield new Promise((resolve) => setTimeout(resolve, 1000));
            if (ch && connectionState === "connected")
                return ch;
        }
        return yield establishConnection();
    });
}
function establishConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isConnecting || isShuttingDown) {
            yield new Promise((resolve) => setTimeout(resolve, 1000));
            if (ch)
                return ch;
            throw new Error("Connection attempt aborted during shutdown");
        }
        isConnecting = true;
        connectionState = "connecting";
        try {
            const url = process.env.RABBIT_URL;
            if (!url)
                throw new Error("RABBIT_URL is not set");
            console.log("Connecting to RabbitMQ...");
            // Close existing connection if any
            yield closeConnections();
            // Connect without type casting first
            const connection = yield amqp.connect(url);
            // Now cast to our custom type
            conn = connection;
            // Enhanced error handling
            conn.on("error", (error) => {
                console.error("RabbitMQ connection error:", error.message);
                connectionState = "disconnected";
                if (!isShuttingDown) {
                    scheduleReconnection();
                }
            });
            conn.on("close", () => {
                console.log("RabbitMQ connection closed");
                connectionState = "disconnected";
                if (!isShuttingDown) {
                    scheduleReconnection();
                }
            });
            // Create channel
            const channel = yield conn.createChannel();
            ch = channel;
            // Channel error handling
            ch.on("error", (error) => {
                console.error("RabbitMQ channel error:", error.message);
            });
            ch.on("close", () => {
                console.log("RabbitMQ channel closed");
            });
            yield ch.prefetch(Number(process.env.WORKER_PREFETCH || 8));
            console.log("RabbitMQ connected successfully");
            connectionState = "connected";
            reconnectAttempts = 0;
            isConnecting = false;
            return ch;
        }
        catch (error) {
            isConnecting = false;
            connectionState = "disconnected";
            console.error("Failed to connect to RabbitMQ:", error);
            if (!isShuttingDown) {
                scheduleReconnection();
            }
            throw error;
        }
    });
}
function scheduleReconnection() {
    if (isShuttingDown || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error("Max reconnection attempts reached. Giving up.");
        }
        return;
    }
    reconnectAttempts++;
    const delay = Math.min(RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 30000);
    console.log(`Scheduling reconnection attempt ${reconnectAttempts} in ${delay}ms`);
    setTimeout(() => {
        if (!isConnecting && connectionState !== "connected" && !isShuttingDown) {
            establishConnection().catch(console.error);
        }
    }, delay);
}
function closeConnections() {
    return __awaiter(this, void 0, void 0, function* () {
        isConnecting = false;
        connectionState = "disconnected";
        isShuttingDown = true; // Prevent reconnections
        if (ch) {
            try {
                yield ch.close();
            }
            catch (error) {
                console.warn("Error closing channel:", error);
            }
            finally {
                ch = null;
            }
        }
        if (conn) {
            try {
                yield conn.close();
            }
            catch (error) {
                console.warn("Error closing connection:", error);
            }
            finally {
                conn = null;
            }
        }
    });
}
// Enhanced health check
function checkConnectionHealth() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (connectionState !== "connected" || !conn || !ch)
                return false;
            // Quick ping test
            yield ch.assertQueue("health_check", {
                durable: false,
                autoDelete: true,
                messageTtl: 1000,
            });
            yield ch.deleteQueue("health_check");
            return true;
        }
        catch (error) {
            console.warn("Connection health check failed:", error);
            return false;
        }
    });
}
// Graceful shutdown
function gracefulShutdown() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Performing graceful shutdown of RabbitMQ connections...");
        isShuttingDown = true; // Prevent any reconnection attempts
        yield closeConnections();
    });
}
