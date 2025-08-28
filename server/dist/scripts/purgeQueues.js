"use strict";
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
// server/src/scripts/purgeQueues.ts
const dotenv = __importStar(require("dotenv"));
const path_1 = require("path");
// Load environment variables
dotenv.config({ path: (0, path_1.resolve)(__dirname, "../../.env") });
const connectionManager_1 = require("../queue/connectionManager");
function purgeQueues() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const channel = yield (0, connectionManager_1.getChannel)();
            const queues = [
                "embeddings.generate",
                "webhook.deliveries",
                "webhook.retries",
                "webhook.dead_letter",
            ];
            for (const queue of queues) {
                try {
                    // First declare the queue with the same arguments as in bus.ts
                    if (queue !== "webhook.dead_letter") {
                        yield channel.assertQueue(queue, {
                            durable: true,
                            deadLetterExchange: `${queue}.dlx`,
                            deadLetterRoutingKey: queue,
                        });
                    }
                    else {
                        yield channel.assertQueue(queue, { durable: true });
                    }
                    // Now try to delete
                    yield channel.deleteQueue(queue);
                    console.log(`✅ Deleted queue: ${queue}`);
                }
                catch (error) {
                    if (error.code === 404) {
                        console.log(`ℹ️ Queue ${queue} does not exist`);
                    }
                    else {
                        console.log(`⚠️ Could not delete queue ${queue}, trying to purge instead:`, error.message);
                        try {
                            // If delete fails, try to purge
                            const purgeResult = yield channel.purgeQueue(queue);
                            console.log(`✅ Purged ${purgeResult.messageCount} messages from: ${queue}`);
                        }
                        catch (purgeError) {
                            console.error(`❌ Failed to purge queue ${queue}:`, purgeError.message);
                        }
                    }
                }
            }
            // Also clean up dead letter exchanges
            const exchanges = ["embeddings.generate.dlx", "webhook.deliveries.dlx", "webhook.retries.dlx"];
            for (const exchange of exchanges) {
                try {
                    yield channel.deleteExchange(exchange);
                    console.log(`✅ Deleted exchange: ${exchange}`);
                }
                catch (error) {
                    if (error.code !== 404) {
                        console.log(`ℹ️ Exchange ${exchange} does not exist`);
                    }
                }
            }
            console.log("✅ Queue cleanup completed");
            process.exit(0);
        }
        catch (error) {
            console.error("❌ Purge failed:", error);
            process.exit(1);
        }
    });
}
purgeQueues();
