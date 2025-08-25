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
exports.socketService = exports.SocketService = void 0;
const redis_1 = require("../config/redis");
class SocketService {
    constructor() {
        this.io = null;
        this.isSubscribed = false;
        this.healthCheckInterval = null;
    }
    static getInstance() {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }
    initialize(io) {
        this.io = io;
        this.setupSocketHandlers();
        this.setupRedisSubscriptions();
        this.startHealthChecks();
    }
    startHealthChecks() {
        // Check Redis connection every 30 seconds
        this.healthCheckInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const isHealthy = yield (0, redis_1.checkRedisHealth)();
                if (!isHealthy) {
                    console.warn("Redis connection unhealthy, reconnecting...");
                    yield this.reconnectRedis();
                }
            }
            catch (error) {
                console.error("Health check failed:", error);
            }
        }), 30000);
    }
    stopHealthChecks() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    setupSocketHandlers() {
        if (!this.io)
            return;
        this.io.on("connection", (socket) => {
            console.log("Socket connected:", socket.id);
            socket.on("join_company", (companyId) => {
                socket.join(`company:${companyId}`);
                console.log(`Socket ${socket.id} joined company:${companyId}`);
            });
            socket.on("disconnect", () => {
                console.log("Socket disconnected:", socket.id);
            });
            socket.on("ping", (cb) => {
                cb("pong");
            });
        });
    }
    setupRedisSubscriptions() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isSubscribed)
                return;
            try {
                const { subClient } = yield (0, redis_1.getRedisPubSub)();
                // Remove any existing listeners to avoid duplicates
                subClient.removeAllListeners("message");
                // Subscribe to channels
                yield subClient.subscribe("alerts", this.handleAlertMessage.bind(this));
                yield subClient.subscribe("upload_status", this.handleStatusMessage.bind(this));
                yield subClient.subscribe("threat_updates", this.handleThreatMessage.bind(this));
                this.isSubscribed = true;
                console.log("Redis subscriptions established");
            }
            catch (error) {
                console.error("Failed to setup Redis subscriptions:", error);
                // Retry after delay with exponential backoff
                setTimeout(() => this.setupRedisSubscriptions(), 5000);
            }
        });
    }
    reconnectRedis() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log("Reconnecting Redis subscriptions...");
            this.isSubscribed = false;
            yield this.setupRedisSubscriptions();
        });
    }
    handleAlertMessage(message) {
        try {
            const parsed = JSON.parse(message);
            const { companyId, event, _metadata } = parsed;
            if (!companyId || !event) {
                console.error("Invalid alert message format:", parsed);
                return;
            }
            this.emitToCompany("alert", companyId, Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() }));
        }
        catch (error) {
            console.error("Error processing alert message:", error, message);
        }
    }
    handleThreatMessage(message) {
        try {
            const parsed = JSON.parse(message);
            const { companyId, event, _metadata } = parsed;
            if (!companyId || !event) {
                console.error("Invalid threat message format:", parsed);
                return;
            }
            this.emitToCompany("threat_update", companyId, Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() }));
        }
        catch (error) {
            console.error("Error processing threat message:", error, message);
        }
    }
    emitToCompany(event, companyId, data) {
        if (!this.io) {
            console.error("Socket.IO not initialized");
            return;
        }
        this.io.to(`company:${companyId}`).emit(event, data);
        console.log(`Emitted ${event} to company ${companyId}`);
    }
    // Add this method to handle status messages
    handleStatusMessage(message) {
        try {
            console.log("Raw status message:", message);
            const parsed = JSON.parse(message);
            console.log("Parsed status message:", parsed);
            // Extract companyId and event from the correct structure
            const { companyId, event, _metadata } = parsed;
            if (!companyId || !event) {
                console.error("Invalid message format:", parsed);
                return;
            }
            // Handle different status types
            switch (event.type) {
                case "upload_progress":
                    this.emitToCompany("upload_progress", companyId, Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() }));
                    break;
                case "upload_complete":
                    this.emitToCompany("upload_complete", companyId, Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() }));
                    break;
                case "upload_error":
                    this.emitToCompany("upload_error", companyId, Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() }));
                    break;
                default:
                    this.emitToCompany("upload_status", companyId, Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() }));
            }
        }
        catch (error) {
            console.error("Error processing status message:", error, message);
        }
    }
    // Public method for main server to emit events
    emitAlert(companyId, event) {
        this.emitToCompany("alert", companyId, event);
    }
    emitStatus(companyId, event) {
        this.emitToCompany("upload_status", companyId, event);
    }
    shutdown() {
        this.stopHealthChecks();
        this.io = null;
        this.isSubscribed = false;
    }
}
exports.SocketService = SocketService;
// Singleton export
exports.socketService = SocketService.getInstance();
