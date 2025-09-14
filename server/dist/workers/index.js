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
const embeddingWorker_1 = require("./embeddingWorker");
const webhookQueue_1 = require("../queue/webhookQueue");
const connectionManager_1 = require("../queue/connectionManager");
(function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let retryCount = 0;
        const MAX_RETRIES = 10;
        while (retryCount < MAX_RETRIES) {
            try {
                yield (0, connectionManager_1.getChannel)();
                yield Promise.all([(0, embeddingWorker_1.startEmbeddingWorker)(), (0, webhookQueue_1.startWebhookConsumer)()]);
                break;
            }
            catch (error) {
                retryCount++;
                if (retryCount >= MAX_RETRIES) {
                    process.exit(1);
                }
                const delay = Math.pow(2, retryCount) * 1000;
                yield new Promise((resolve) => setTimeout(resolve, delay));
            }
        }
        const healthCheckInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield (0, connectionManager_1.checkConnectionHealth)();
            }
            catch (error) { }
        }), 30000);
        const shutdownSignals = ["SIGINT", "SIGTERM", "SIGQUIT"];
        shutdownSignals.forEach((signal) => {
            process.on(signal, () => __awaiter(this, void 0, void 0, function* () {
                clearInterval(healthCheckInterval);
                yield (0, connectionManager_1.gracefulShutdown)();
                process.exit(0);
            }));
        });
    });
})();
