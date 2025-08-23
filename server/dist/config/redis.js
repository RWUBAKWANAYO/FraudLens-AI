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
const redis_1 = require("redis");
let client = null;
function getRedis() {
    return __awaiter(this, void 0, void 0, function* () {
        if (client && client.isOpen)
            return client;
        const url = process.env.REDIS_URL;
        if (!url)
            throw new Error("REDIS_URL is not set");
        client = (0, redis_1.createClient)({ url });
        client.on("error", (e) => console.error("Redis error:", e));
        yield client.connect();
        return client;
    });
}
