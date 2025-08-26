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
exports.redisPublisher = exports.RedisPublisher = void 0;
// server/src/services/redisPublisher.ts
const redis_1 = require("../config/redis");
class RedisPublisher {
    static getInstance() {
        if (!RedisPublisher.instance) {
            RedisPublisher.instance = new RedisPublisher();
        }
        return RedisPublisher.instance;
    }
    publish(channel_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (channel, message, options = { retry: 3, timeout: 5000 }) {
            const { retry = 3, timeout = 5000 } = options;
            for (let attempt = 1; attempt <= retry; attempt++) {
                try {
                    const { pubClient } = yield (0, redis_1.getRedisPubSub)();
                    const payload = JSON.stringify(Object.assign(Object.assign({}, message), { _metadata: {
                            publishedAt: new Date().toISOString(),
                            attempt,
                            channel,
                        } }));
                    yield Promise.race([
                        pubClient.publish(channel, payload),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Publish timeout")), timeout)),
                    ]);
                    console.log(`Published to ${channel} (attempt ${attempt})`);
                    return true;
                }
                catch (error) {
                    console.error(`Publish attempt ${attempt} failed:`, error);
                    if (attempt === retry) {
                        console.error(`All ${retry} publish attempts failed for channel ${channel}`);
                        return false;
                    }
                    yield new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
                }
            }
            return false;
        });
    }
    publishAlert(companyId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.publish("alerts", { companyId, event });
        });
    }
    publishStatus(companyId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.publish("upload_status", { companyId, event });
        });
    }
    publishThreat(companyId, event) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.publish("threat_updates", { companyId, event });
        });
    }
    // NEW: Enhanced status publishing with detailed progress
    publishUploadProgress(companyId, uploadId, progress, stage, message, details) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.publishStatus(companyId, {
                type: "upload_progress",
                uploadId,
                progress,
                stage,
                message,
                details,
                timestamp: new Date().toISOString(),
            });
        });
    }
    publishUploadComplete(companyId, uploadId, result, threats, summary) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.publishStatus(companyId, {
                type: "upload_complete",
                uploadId,
                result,
                threats,
                summary,
                timestamp: new Date().toISOString(),
            });
        });
    }
    publishUploadError(companyId, uploadId, error) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.publishStatus(companyId, {
                type: "upload_error",
                uploadId,
                error,
                timestamp: new Date().toISOString(),
            });
        });
    }
}
exports.RedisPublisher = RedisPublisher;
exports.redisPublisher = RedisPublisher.getInstance();
