import app from "./app";
import http from "http";
import { Server } from "socket.io";
import { connectDB } from "./config/db";
import { socketService } from "./services/socketService";
import { closeRedisConnections } from "./config/redis";
import { closeConnections as closeRabbitMQConnections } from "./queue/connectionManager"; // Import RabbitMQ close function

const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const io = new Server(server, {
  cors: {
    origin: process.env.PUBLIC_WS_ORIGIN || "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    skipMiddlewares: true,
  },
});

// Initialize socket service
socketService.initialize(io);

// ==================== GLOBAL ERROR HANDLERS ====================
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Don't exit immediately for uncaught exceptions related to connections
  // Let the reconnection logic handle it
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // You might want to exit here for unhandled rejections as they're more serious
  // process.exit(1);
});

// Global promise rejection handler (Node.js 15+)
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Application specific logging, throwing an error, or other logic here
});

// ==================== GRACEFUL SHUTDOWN ====================
async function gracefulShutdown() {
  console.log("Shutting down gracefully...");

  try {
    // Close HTTP server
    server.close(() => {
      console.log("HTTP server closed");
    });

    // Close all connections
    await closeRedisConnections();
    await closeRabbitMQConnections();

    // Add any other cleanup here (database, etc.)

    console.log("All connections closed, exiting process");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle other process events
process.on("exit", (code) => {
  console.log(`Process exited with code: ${code}`);
});

// ==================== SERVER STARTUP ====================
async function startServer() {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Socket.IO enabled with CORS origin: ${process.env.PUBLIC_WS_ORIGIN}`);
    });

    // Handle server errors
    server.on("error", (error) => {
      console.error("Server error:", error);
      // You might want to restart the server or handle specific errors
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer().catch(console.error);
