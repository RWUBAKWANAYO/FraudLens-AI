import app from "./app";
import http from "http";
import { Server } from "socket.io";
import { initializeSocket } from "./config/socket";
import { connectDB } from "./config/db";

const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const io = new Server(server, {
  cors: { origin: "*" },
});
async function startServer() {
  await connectDB();
  initializeSocket(io);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export { server, io };
