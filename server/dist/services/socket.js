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
                // Subscribe to channels
                yield subClient.subscribe("alerts", this.handleAlertMessage.bind(this));
                yield subClient.subscribe("upload_status", this.handleStatusMessage.bind(this));
                yield subClient.subscribe("threat_updates", this.handleThreatMessage.bind(this));
                this.isSubscribed = true;
                console.log("Redis subscriptions established");
            }
            catch (error) {
                console.error("Failed to setup Redis subscriptions:", error);
                // Retry after delay
                setTimeout(() => this.setupRedisSubscriptions(), 5000);
            }
        });
    }
    handleAlertMessage(message) {
        try {
            const { companyId, event, timestamp = Date.now() } = JSON.parse(message);
            this.emitToCompany("alert", companyId, Object.assign(Object.assign({}, event), { timestamp }));
        }
        catch (error) {
            console.error("Error processing alert message:", error);
        }
    }
    handleStatusMessage(message) {
        try {
            const { companyId, event, timestamp = Date.now() } = JSON.parse(message);
            this.emitToCompany("upload_status", companyId, Object.assign(Object.assign({}, event), { timestamp }));
        }
        catch (error) {
            console.error("Error processing status message:", error);
        }
    }
    handleThreatMessage(message) {
        try {
            const { companyId, event, timestamp = Date.now() } = JSON.parse(message);
            this.emitToCompany("threat_update", companyId, Object.assign(Object.assign({}, event), { timestamp }));
        }
        catch (error) {
            console.error("Error processing threat message:", error);
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
    // Public method for main server to emit events
    emitAlert(companyId, event) {
        this.emitToCompany("alert", companyId, event);
    }
    emitStatus(companyId, event) {
        this.emitToCompany("upload_status", companyId, event);
    }
}
exports.SocketService = SocketService;
// Singleton export
exports.socketService = SocketService.getInstance();
