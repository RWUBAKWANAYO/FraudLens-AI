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
exports.io = exports.server = void 0;
const app_1 = __importDefault(require("./app"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const socket_1 = require("./config/socket");
const db_1 = require("./config/db");
const server = http_1.default.createServer(app_1.default);
exports.server = server;
const PORT = process.env.PORT || 8080;
const io = new socket_io_1.Server(server, {
    cors: { origin: "*" },
});
exports.io = io;
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, db_1.connectDB)();
        (0, socket_1.initializeSocket)(io);
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    });
}
startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});
