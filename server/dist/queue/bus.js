"use strict";
// server/src/queue/bus.ts
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
const MAX_PUBLISH_RETRIES = 3;
const PUBLISH_RETRY_DELAY = 1000;
function publish(queue_1, msg_1) {
    return __awaiter(this, arguments, void 0, function* (queue, msg, retryCount = 0) {
        try {
            const channel = yield (0, connectionManager_1.getChannel)();
            yield channel.assertQueue(queue, { durable: true });
            const success = channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)), {
                persistent: true,
            });
            if (!success) {
                throw new Error("Message not queued (flow control)");
            }
            return true;
        }
        catch (error) {
            console.error(`Failed to publish to ${queue} (attempt ${retryCount + 1}):`, error);
            if (retryCount < MAX_PUBLISH_RETRIES) {
                yield new Promise((resolve) => setTimeout(resolve, PUBLISH_RETRY_DELAY * (retryCount + 1)));
                return publish(queue, msg, retryCount + 1);
            }
            return false;
        }
    });
}
function consume(queue, handler) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channel = yield (0, connectionManager_1.getChannel)();
            yield channel.assertQueue(queue, { durable: true });
            console.log(`Starting consumer for queue: ${queue}`);
            yield channel.consume(queue, (msg) => __awaiter(this, void 0, void 0, function* () {
                if (!msg)
                    return;
                try {
                    const payload = JSON.parse(msg.content.toString());
                    yield handler(payload, channel, msg); // Pass channel and msg
                }
                catch (error) {
                    console.error(`Error processing message from ${queue}:`, error);
                    // Handle errors appropriately
                }
            }), { noAck: false } // Important: Manual acknowledgment
            );
        }
        catch (error) {
            console.error(`Failed to start consumer for ${queue}:`, error);
            setTimeout(() => consume(queue, handler), 5000);
        }
    });
}
// Graceful shutdown handler
process.on("SIGTERM", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGTERM received, closing RabbitMQ connections");
    yield (0, connectionManager_1.closeConnections)();
}));
process.on("SIGINT", () => __awaiter(void 0, void 0, void 0, function* () {
    console.log("SIGINT received, closing RabbitMQ connections");
    yield (0, connectionManager_1.closeConnections)();
}));
