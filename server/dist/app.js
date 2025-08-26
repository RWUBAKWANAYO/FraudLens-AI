"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// app.ts
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const audit_1 = require("./routes/audit");
const auth_1 = require("./routes/auth");
const users_1 = require("./routes/users");
const webhook_1 = require("./routes/webhook");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use("/api/v1/audit", audit_1.auditRouter);
app.use("/api/v1/auth", auth_1.authRouter);
app.use("/api/v1/users", users_1.usersRouter);
app.use("/api/v1/webhooks", webhook_1.webhookRouter);
// ==================== EXPRESS ERROR HANDLING MIDDLEWARE ====================
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
// Global error handler middleware
app.use((error, _req, res, _next) => {
    console.error("Express error handler:", error);
    // Don't expose internal errors in production
    const message = process.env.NODE_ENV === "production" ? "Something went wrong" : error.message;
    res.status(error.status || 500).json(Object.assign({ error: message }, (process.env.NODE_ENV !== "production" && { stack: error.stack })));
});
// Handle unhandled promise rejections in Express routes
process.on("unhandledRejection", (reason, _promise) => {
    console.error("Unhandled Rejection in Express route:", reason);
    // You might want to log this to a monitoring service
});
exports.default = app;
