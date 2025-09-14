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
exports.publish = publish;
exports.consume = consume;
const connectionManager_1 = require("./connectionManager");
const MAX_PUBLISH_RETRIES = 4;
const PUBLISH_RETRY_BASE_MS = 500;
function publish(queue_1, msg_1) {
    return __awaiter(this, arguments, void 0, function* (queue, msg, retryCount = 0) {
        try {
            const channel = yield (0, connectionManager_1.getChannel)();
            yield channel.assertQueue(queue, { durable: true });
            const ok = channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), {
                persistent: true,
                contentType: "application/json",
            });
            if (!ok) {
                throw new Error("Message not queued (flow control)");
            }
            return true;
        }
        catch (error) {
            console.error(`Failed to publish to ${queue} (attempt ${retryCount + 1}):`, error && error.message);
            if (retryCount < MAX_PUBLISH_RETRIES) {
                const delay = PUBLISH_RETRY_BASE_MS * Math.pow(2, retryCount);
                yield new Promise((r) => setTimeout(r, delay));
                return publish(queue, msg, retryCount + 1);
            }
            return false;
        }
    });
}
function consume(queue_1, handler_1) {
    return __awaiter(this, arguments, void 0, function* (queue, handler, opts = {}) {
        const consumerId = opts.consumerId || `${queue}-${Math.floor(Math.random() * 10000)}`;
        const prefetch = typeof opts.prefetch === "number" ? opts.prefetch : undefined;
        const requeueOnError = !!opts.requeueOnError;
        function start() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const ch = yield (0, connectionManager_1.createConsumerChannel)(consumerId, prefetch);
                    yield ch.assertQueue(queue, { durable: true });
                    console.log(`Starting consumer ${consumerId} for queue: ${queue}`);
                    ch.consume(queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                        if (!msg)
                            return;
                        let payload;
                        try {
                            payload = JSON.parse(msg.content.toString());
                        }
                        catch (err) {
                            console.error("Failed to parse message JSON; acking to drop:", err);
                            safeAck(ch, msg);
                            return;
                        }
                        try {
                            yield handler(payload, ch, msg);
                            safeAck(ch, msg);
                        }
                        catch (err) {
                            console.error(`Error processing message from ${queue}:`, (err && err.message) || err);
                            safeNack(ch, msg, requeueOnError);
                        }
                    }), { noAck: false });
                    ch.on("close", () => {
                        console.warn(`Consumer channel ${consumerId} closed; restarting in 2s`);
                        setTimeout(start, 2000);
                    });
                    ch.on("error", (err) => {
                        console.error(`Consumer channel ${consumerId} error:`, (err && err.message) || err);
                    });
                }
                catch (err) {
                    console.error(`Failed to start consumer ${consumerId} for ${queue}:`, err);
                    setTimeout(start, 2000);
                }
            });
        }
        start();
    });
}
function safeAck(channel, msg) {
    try {
        if (channel && channel.connection) {
            channel.ack(msg);
        }
        else {
            console.warn("Attempted to ack on closed channel — skipping");
        }
    }
    catch (err) {
        console.warn("Failed to ack message (channel may be closed):", (err && err.message) || err);
    }
}
function safeNack(channel, msg, requeue = false) {
    try {
        if (channel && channel.connection) {
            channel.nack(msg, false, requeue);
        }
        else {
            console.warn("Attempted to nack on closed channel — skipping");
        }
    }
    catch (err) {
        console.warn("Failed to nack message (channel may be closed):", (err && err.message) || err);
    }
}
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGTERM received, closing RabbitMQ connections");
    yield (0, connectionManager_1.closeConnections)();
}));
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGINT received, closing RabbitMQ connections");
    yield (0, connectionManager_1.closeConnections)();
}));
