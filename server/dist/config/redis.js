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
exports.getRedis = getRedis;
exports.getRedisPubSub = getRedisPubSub;
exports.closeRedisConnections = closeRedisConnections;
exports.checkRedisHealth = checkRedisHealth;
// config/redis.ts
const redis_1 = require("redis");
let redisClient = null;
let pubClient = null;
let subClient = null;
let isReconnecting = false;
const MAX_RECONNECT_ATTEMPTS = 10;
function getRedis() {
    return __awaiter(this, void 0, void 0, function* () {
        if (redisClient && redisClient.isOpen)
            return redisClient;
        const url = process.env.REDIS_URL;
        if (!url)
            throw new Error("REDIS_URL is required");
        try {
            redisClient = (0, redis_1.createClient)({
                url,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > MAX_RECONNECT_ATTEMPTS) {
                            console.error("Max Redis reconnection attempts reached");
                            return false;
                        }
                        const delay = Math.min(retries * 1000, 5000);
                        console.log(`Redis reconnecting in ${delay}ms (attempt ${retries})`);
                        return delay;
                    },
                },
            });
            redisClient.on("error", (err) => console.error("Redis client error:", err.message));
            redisClient.on("connect", () => console.log("Redis client connected"));
            redisClient.on("ready", () => console.log("Redis client ready"));
            redisClient.on("reconnecting", () => console.log("Redis client reconnecting"));
            redisClient.on("end", () => console.log("Redis client disconnected"));
            yield redisClient.connect();
            return redisClient;
        }
        catch (error) {
            console.error("Failed to connect to Redis:", error);
            throw error;
        }
    });
}
function getRedisPubSub() {
    return __awaiter(this, void 0, void 0, function* () {
        if (pubClient && subClient && pubClient.isOpen && subClient.isOpen) {
            return { pubClient, subClient };
        }
        const url = process.env.REDIS_URL;
        if (!url)
            throw new Error("REDIS_URL is required");
        if (isReconnecting) {
            // Wait for ongoing reconnection
            yield new Promise((resolve) => setTimeout(resolve, 1000));
            if (pubClient && subClient && pubClient.isOpen && subClient.isOpen) {
                return { pubClient, subClient };
            }
        }
        isReconnecting = true;
        try {
            // Close existing connections properly
            yield closeRedisPubSubConnections();
            // Create new connections with enhanced reconnection strategy
            pubClient = (0, redis_1.createClient)({
                url,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > MAX_RECONNECT_ATTEMPTS)
                            return false;
                        return Math.min(retries * 1000, 5000);
                    },
                },
            });
            subClient = (0, redis_1.createClient)({
                url,
                socket: {
                    reconnectStrategy: (retries) => {
                        if (retries > MAX_RECONNECT_ATTEMPTS)
                            return false;
                        return Math.min(retries * 1000, 5000);
                    },
                },
            });
            const setupClientHandlers = (client, type) => {
                client.on("error", (err) => console.error(`Redis ${type} error:`, err.message));
                client.on("connect", () => console.log(`Redis ${type} connected`));
                client.on("ready", () => console.log(`Redis ${type} ready`));
                client.on("reconnecting", () => console.log(`Redis ${type} reconnecting`));
                client.on("end", () => {
                    console.log(`Redis ${type} disconnected`);
                    // Trigger reconnection
                    setTimeout(() => getRedisPubSub().catch(console.error), 5000);
                });
            };
            setupClientHandlers(pubClient, "pub");
            setupClientHandlers(subClient, "sub");
            yield Promise.all([pubClient.connect(), subClient.connect()]);
            isReconnecting = false;
            return { pubClient, subClient };
        }
        catch (error) {
            isReconnecting = false;
            console.error("Failed to connect to Redis pub/sub:", error);
            // Schedule retry
            setTimeout(() => getRedisPubSub().catch(console.error), 5000);
            throw error;
        }
    });
}
function closeRedisPubSubConnections() {
    return __awaiter(this, void 0, void 0, function* () {
        const clients = [pubClient, subClient].filter(Boolean);
        yield Promise.allSettled(clients.map((client) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (client && client.isOpen) {
                    yield client.quit();
                }
            }
            catch (error) {
                console.warn("Error closing Redis client:", error);
            }
        })));
        pubClient = null;
        subClient = null;
    });
}
function closeRedisConnections() {
    return __awaiter(this, void 0, void 0, function* () {
        const clients = [redisClient, pubClient, subClient].filter(Boolean);
        yield Promise.allSettled(clients.map((client) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (client && client.isOpen) {
                    yield client.quit();
                }
            }
            catch (error) {
                console.warn("Error closing Redis client:", error);
            }
        })));
        redisClient = null;
        pubClient = null;
        subClient = null;
    });
}
// Health check function
function checkRedisHealth() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield getRedis();
            yield client.ping();
            return true;
        }
        catch (error) {
            return false;
        }
    });
}
