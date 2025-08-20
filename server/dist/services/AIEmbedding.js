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
const openai_1 = __importDefault(require("openai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const client = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
const USE_LOCAL = process.env.USE_LOCAL === "true";
const LOCAL_AI_URL = process.env.LOCAL_AI_URL;
function getEmbedding(text) {
    return __awaiter(this, void 0, void 0, function* () {
        if (USE_LOCAL) {
            const res = yield (0, node_fetch_1.default)(`${LOCAL_AI_URL}/embed`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });
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
