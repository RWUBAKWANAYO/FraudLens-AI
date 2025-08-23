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
const explainWorker_1 = require("./explainWorker");
const bus_1 = require("../queue/bus");
(function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, bus_1.getChannel)(); // establish connection early
        yield Promise.all([(0, embeddingWorker_1.startEmbeddingWorker)(), (0, explainWorker_1.startExplainWorker)()]);
        console.log("Workers running: embeddings.generate, threat.explain");
    });
})();
