import express from "express";
import "dotenv/config";
import cors from "cors";
import { auditRouter } from "./routes/audit";
import { authRouter } from "./routes/auth";
import { usersRouter } from "./routes/users";
import { webhookRouter } from "./routes/webhook";
import { apiKeyRouter } from "./routes/apiKey";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/v1/audit", auditRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", usersRouter);
app.use("/api/v1/webhooks", webhookRouter);
app.use("/api/v1/api-keys", apiKeyRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = process.env.NODE_ENV === "production" ? "Something went wrong" : error.message;

  res.status(error.status || 500).json({
    error: message,
    ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
  });
});

process.on("unhandledRejection", (reason, _promise) => {
  console.error("Unhandled Rejection in Express route:", reason);
});

export default app;
