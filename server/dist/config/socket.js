"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSocket = void 0;
const initializeSocket = (io) => {
    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);
        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });
};
exports.initializeSocket = initializeSocket;
