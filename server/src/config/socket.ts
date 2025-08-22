import { Server } from "socket.io";

let io: Server | null = null;

export function attachSocket(ioInstance: Server) {
  io = ioInstance;

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("join_company", (companyId: string) => {
      socket.join(`company:${companyId}`);
      console.log(`Socket ${socket.id} joined company:${companyId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });
}

export function pushAlert(companyId: string, event: any) {
  if (!io) {
    console.error("Socket.IO server not initialized!");
    return;
  }
  console.log("SOCKET EVENT EMITTED to company:", companyId, event);
  io.to(`company:${companyId}`).emit("alert", event);
}
