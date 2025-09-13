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
        this.HEALTH_CHECK_INTERVAL = 30000;
        this.RECONNECT_DELAY = 5000;
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
        this.healthCheckInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                const isHealthy = yield (0, redis_1.checkRedisHealth)();
                if (!isHealthy) {
                    yield this.reconnectRedis();
                }
            }
            catch (error) { }
        }), this.HEALTH_CHECK_INTERVAL);
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
            socket.on("join_company", (companyId) => {
                socket.join(`company:${companyId}`);
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
                subClient.removeAllListeners("message");
                yield subClient.subscribe("alerts", this.handleAlertMessage.bind(this));
                yield subClient.subscribe("upload_status", this.handleStatusMessage.bind(this));
                yield subClient.subscribe("threat_updates", this.handleThreatMessage.bind(this));
                this.isSubscribed = true;
            }
            catch (error) {
                setTimeout(() => this.setupRedisSubscriptions(), this.RECONNECT_DELAY);
            }
        });
    }
    reconnectRedis() {
        return __awaiter(this, void 0, void 0, function* () {
            this.isSubscribed = false;
            yield this.setupRedisSubscriptions();
        });
    }
    handleAlertMessage(message) {
        try {
            const parsed = JSON.parse(message);
            const { companyId, event, _metadata } = parsed;
            if (!companyId || !event) {
                return;
            }
            this.emitToCompany("alert", companyId, Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() }));
        }
        catch (error) { }
    }
    handleThreatMessage(message) {
        try {
            const parsed = JSON.parse(message);
            const { companyId, event, _metadata } = parsed;
            if (!companyId || !event) {
                return;
            }
            this.emitToCompany("threat_update", companyId, Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() }));
        }
        catch (error) { }
    }
    emitToCompany(event, companyId, data) {
        if (!this.io) {
            return;
        }
        this.io.to(`company:${companyId}`).emit(event, data);
    }
    handleStatusMessage(message) {
        try {
            const parsed = JSON.parse(message);
            const { companyId, event, _metadata } = parsed;
            if (!companyId || !event) {
                return;
            }
            const eventData = Object.assign(Object.assign({}, event), { timestamp: (_metadata === null || _metadata === void 0 ? void 0 : _metadata.publishedAt) || new Date().toISOString() });
            switch (event.type) {
                case "upload_progress":
                    this.emitToCompany("upload_progress", companyId, eventData);
                    break;
                case "upload_complete":
                    this.emitToCompany("upload_complete", companyId, eventData);
                    break;
                case "upload_error":
                    this.emitToCompany("upload_error", companyId, eventData);
                    break;
                default:
                    this.emitToCompany("upload_status", companyId, eventData);
            }
        }
        catch (error) { }
    }
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
exports.socketService = SocketService.getInstance();
