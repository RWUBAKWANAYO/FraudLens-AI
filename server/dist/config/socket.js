"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachSocket = attachSocket;
exports.pushAlert = pushAlert;
let io = null;
function attachSocket(ioInstance) {
    io = ioInstance;
    io.on("connection", (socket) => {
        console.log("Socket connected:", socket.id);
        socket.on("join_company", (companyId) => {
            socket.join(`company:${companyId}`);
            console.log(`Socket ${socket.id} joined company:${companyId}`);
        });
        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);
        });
    });
}
function pushAlert(companyId, event) {
    if (!io) {
        console.error("Socket.IO server not initialized!");
        return;
    }
    console.log("SOCKET EVENT EMITTED to company:", companyId, event);
    io.to(`company:${companyId}`).emit("alert", event);
}
