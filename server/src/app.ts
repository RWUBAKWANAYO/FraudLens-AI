// app.ts
import express from "express";
import "dotenv/config";
import cors from "cors";
import { router } from "./routes";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1", router);

// ==================== EXPRESS ERROR HANDLING MIDDLEWARE ====================

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Global error handler middleware
app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Express error handler:", error);

  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === "production" ? "Something went wrong" : error.message;

  res.status(error.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
});

// Handle unhandled promise rejections in Express routes
process.on("unhandledRejection", (reason, _promise) => {
  console.error("Unhandled Rejection in Express route:", reason);
  // You might want to log this to a monitoring service
});

export default app;
