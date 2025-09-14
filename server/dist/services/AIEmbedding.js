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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmbedding = getEmbedding;
exports.getEmbeddingsBatch = getEmbeddingsBatch;
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const client = new openai_1.default({ apiKey: process.env.OPENAI_API_KEY });
const USE_LOCAL_AI = process.env.USE_LOCAL_AI === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL || "http://localhost:5001";
// simple promise pool so we don’t overwhelm local endpoints
function pPool(items, limit, fn) {
    return __awaiter(this, void 0, void 0, function* () {
        const ret = new Array(items.length);
        let i = 0, inFlight = 0;
        return yield new Promise((resolve, reject) => {
            const kick = () => {
                if (i === items.length && inFlight === 0)
                    return resolve(ret);
                while (inFlight < limit && i < items.length) {
                    const idx = i++;
                    inFlight++;
                    fn(items[idx])
                        .then((res) => {
                        ret[idx] = res;
                    })
                        .catch(reject)
                        .finally(() => {
                        inFlight--;
                        kick();
                    });
                }
            };
            kick();
        });
    });
}
function getEmbedding(text) {
    return __awaiter(this, void 0, void 0, function* () {
        if (USE_LOCAL_AI) {
            const res = yield (0, node_fetch_1.default)(`${LOCAL_AI_URL}/embed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
            if (!res.ok)
                throw new Error(`Local embed failed: ${res.status}`);
            const data = yield res.json();
            return data.embedding;
        }
        else {
            const response = yield client.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
            });
            return response.data[0].embedding;
        }
    });
}
function getEmbeddingsBatch(texts) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!texts.length)
            return [];
        if (USE_LOCAL_AI) {
            try {
                const res = yield (0, node_fetch_1.default)(`${LOCAL_AI_URL}/embed/batch`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ texts }),
                });
                if (res.ok) {
                    const data = yield res.json();
                    if (Array.isArray(data.embeddings))
                        return data.embeddings;
                }
            }
            catch (_a) {
                console.log("Local AI fail");
            }
            return pPool(texts, 6, (t) => getEmbedding(t));
        }
        else {
            const response = yield client.embeddings.create({
                model: "text-embedding-3-small",
                input: texts,
            });
            return response.data.map((d) => d.embedding);
        }
    });
}
