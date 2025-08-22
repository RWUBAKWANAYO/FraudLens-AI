import app from "./app";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db";
import { attachSocket } from "./config/socket";

const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const io = new Server(server, {
  cors: {
    origin: process.env.PUBLIC_WS_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

attachSocket(io);

async function startServer() {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.IO enabled with CORS origin: ${process.env.PUBLIC_WS_ORIGIN}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
