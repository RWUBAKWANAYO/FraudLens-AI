import app from "./app";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db";
import { socketService } from "./services/socketService";
import { closeRedisConnections } from "./config/redis";
import { closeConnections as closeRabbitMQConnections } from "./queue/connectionManager";

const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const io = new Server(server, {
  cors: {
    origin: process.env.PUBLIC_WS_ORIGIN,
    methods: ["GET", "POST"],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

socketService.initialize(io);

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

async function gracefulShutdown() {
  console.log("Shutting down gracefully...");
  try {
    server.close(() => {
      console.log("HTTP server closed");
    });
    await closeRedisConnections();
    await closeRabbitMQConnections();

    console.log("All connections closed, exiting process");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("exit", (code) => {
  console.log(`Process exited with code: ${code}`);
});

async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO enabled with CORS origin: ${process.env.PUBLIC_WS_ORIGIN}`);
    });

    server.on("error", (error) => {
      console.error("Server error:", error);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer().catch(console.error);
