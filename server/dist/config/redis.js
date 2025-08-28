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
exports.acquireLock = acquireLock;
exports.releaseLock = releaseLock;
const redis_1 = require("redis");
const crypto_1 = require("crypto");
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
                            return false;
                        }
                        return Math.min(retries * 1000, 5000);
                    },
                },
            });
            yield redisClient.connect();
            return redisClient;
        }
        catch (error) {
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
            yield new Promise((resolve) => setTimeout(resolve, 1000));
            if (pubClient && subClient && pubClient.isOpen && subClient.isOpen) {
                return { pubClient, subClient };
            }
        }
        isReconnecting = true;
        try {
            yield closeRedisPubSubConnections();
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
            yield Promise.all([pubClient.connect(), subClient.connect()]);
            isReconnecting = false;
            return { pubClient, subClient };
        }
        catch (error) {
            isReconnecting = false;
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
            catch (error) { }
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
            catch (error) { }
        })));
        redisClient = null;
        pubClient = null;
        subClient = null;
    });
}
function checkRedisHealth() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const client = yield getRedis();
            yield client.ping();
            return true;
        }
        catch (_a) {
            return false;
        }
    });
}
function acquireLock(key, ttlSeconds) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield getRedis();
        const token = (0, crypto_1.randomBytes)(16).toString("hex");
        const res = yield client.set(key, token, { NX: true, EX: ttlSeconds });
        return res === "OK" ? token : null;
    });
}
function releaseLock(key, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const client = yield getRedis();
        const script = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
        yield client.eval(script, { keys: [key], arguments: [token] });
    });
}
