"use strict";
// @ts-nocheck
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
exports.getConnection = getConnection;
exports.getChannel = getChannel;
exports.createConsumerChannel = createConsumerChannel;
exports.checkConnectionHealth = checkConnectionHealth;
exports.closeConnections = closeConnections;
exports.gracefulShutdown = gracefulShutdown;
const amqp = __importStar(require("amqplib"));
let connection = null;
let publisherChannel = null;
const consumerChannels = new Map();
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = Number(process.env.RABBIT_MAX_RECONNECT || 10);
const BASE_RECONNECT_DELAY = Number(process.env.RABBIT_RECONNECT_BASE_MS || 1000);
let isShuttingDown = false;
let connectionState = "disconnected";
function getConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        if (connection && connection.connection && connectionState === "connected") {
            return connection;
        }
        if (isConnecting) {
            yield new Promise((r) => setTimeout(r, 500));
            if (connection && connection.connection && connectionState === "connected")
                return connection;
        }
        return yield establishConnection();
    });
}
function establishConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        if (isConnecting) {
            yield new Promise((r) => setTimeout(r, 500));
            if (connection && connectionState === "connected")
                return connection;
        }
        if (isShuttingDown)
            throw new Error("Shutting down; not creating new connections");
        isConnecting = true;
        connectionState = "connecting";
        try {
            const url = process.env.RABBIT_URL;
            if (!url)
                throw new Error("RABBIT_URL is not set");
            const heartbeatSec = Number(process.env.RABBIT_HEARTBEAT || 30);
            const conn = yield amqp.connect(url, { heartbeat: heartbeatSec });
            conn.on("error", (err) => {
                try {
                    console.error("RabbitMQ connection error:", err && err.message);
                }
                catch (e) { }
                connectionState = "disconnected";
                scheduleReconnect();
            });
            conn.on("close", (err) => {
                try {
                    console.warn("RabbitMQ connection closed", err ? err.message : "");
                }
                catch (e) { }
                connectionState = "disconnected";
                scheduleReconnect();
            });
            connection = conn;
            connectionState = "connected";
            reconnectAttempts = 0;
            isConnecting = false;
            console.log("RabbitMQ connection established");
            return connection;
        }
        catch (err) {
            isConnecting = false;
            connectionState = "disconnected";
            reconnectAttempts++;
            console.error(`Failed to connect to RabbitMQ (attempt ${reconnectAttempts}):`, err);
            if (!isShuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 30000);
                console.log(`Retrying RabbitMQ connect in ${delay}ms`);
                setTimeout(() => establishConnection().catch(console.error), delay);
            }
            throw err;
        }
    });
}
function scheduleReconnect() {
    if (isShuttingDown)
        return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error("Max RabbitMQ reconnection attempts reached");
        return;
    }
    reconnectAttempts++;
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts - 1), 30000);
    console.log(`Scheduling reconnection attempt ${reconnectAttempts} in ${delay}ms`);
    setTimeout(() => establishConnection().catch(console.error), delay);
}
function getChannel() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (publisherChannel && publisherChannel.connection) {
                return publisherChannel;
            }
            const conn = yield getConnection();
            publisherChannel = yield conn.createChannel();
            publisherChannel.on("error", (err) => {
                console.error("Publisher channel error:", (err && err.message) || err);
                try {
                    publisherChannel && publisherChannel.close().catch(() => { });
                }
                finally {
                    publisherChannel = null;
                }
            });
            publisherChannel.on("close", () => {
                console.warn("Publisher channel closed");
                publisherChannel = null;
            });
            return publisherChannel;
        }
        catch (err) {
            publisherChannel = null;
            throw err;
        }
    });
}
function createConsumerChannel(consumerId_1) {
    return __awaiter(this, arguments, void 0, function* (consumerId, prefetch = Number(process.env.WORKER_PREFETCH || 8)) {
        const existing = consumerChannels.get(consumerId);
        if (existing && existing.connection) {
            return existing;
        }
        const conn = yield getConnection();
        const ch = yield conn.createChannel();
        if (prefetch > 0) {
            yield ch.prefetch(prefetch);
        }
        ch.on("error", (err) => {
            console.error(`Consumer channel (${consumerId}) error:`, (err && err.message) || err);
        });
        ch.on("close", () => {
            console.warn(`Consumer channel (${consumerId}) closed`);
            consumerChannels.set(consumerId, null);
        });
        consumerChannels.set(consumerId, ch);
        return ch;
    });
}
function checkConnectionHealth() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!connection || connectionState !== "connected")
                return false;
            const ch = yield connection.createChannel();
            try {
                const q = `health_check_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                yield ch.assertQueue(q, { durable: false, autoDelete: true, messageTtl: 1000 });
                yield ch.deleteQueue(q);
                yield ch.close();
                return true;
            }
            catch (err) {
                try {
                    yield ch.close();
                }
                catch (_) { }
                return false;
            }
        }
        catch (err) {
            return false;
        }
    });
}
function closeConnections() {
    return __awaiter(this, void 0, void 0, function* () {
        isShuttingDown = true;
        yield Promise.allSettled(Array.from(consumerChannels.values()).map((ch) => __awaiter(this, void 0, void 0, function* () {
            if (ch && ch.close) {
                try {
                    yield ch.close();
                }
                catch (e) {
                    console.warn("Error closing consumer channel:", e);
                }
            }
        })));
        consumerChannels.clear();
        if (publisherChannel) {
            try {
                yield publisherChannel.close();
            }
            catch (e) {
                console.warn("Error closing publisher channel:", e);
            }
            publisherChannel = null;
        }
        if (connection) {
            try {
                yield connection.close();
            }
            catch (e) {
                console.warn("Error closing connection:", e);
            }
            connection = null;
        }
        connectionState = "disconnected";
        isConnecting = false;
    });
}
function gracefulShutdown() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Performing graceful RabbitMQ shutdown...");
        isShuttingDown = true;
        yield closeConnections();
    });
}
exports.default = {
    getConnection,
    getChannel,
    createConsumerChannel,
    checkConnectionHealth,
    closeConnections,
    gracefulShutdown,
};
