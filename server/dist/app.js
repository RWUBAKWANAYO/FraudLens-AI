"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
require("dotenv/config");
const cors_1 = __importDefault(require("cors"));
const audit_1 = require("./routes/audit");
const auth_1 = require("./routes/auth");
const users_1 = require("./routes/users");
const webhook_1 = require("./routes/webhook");
const apiKey_1 = require("./routes/apiKey");
const swagger_1 = require("./docs/swagger");
const stats_1 = require("./routes/stats");
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.PUBLIC_WS_ORIGIN,
    credentials: true,
}));
app.use(express_1.default.json());
(0, swagger_1.setupSwagger)(app);
app.use("/api/v1/audit", audit_1.auditRouter);
app.use("/api/v1/auth", auth_1.authRouter);
app.use("/api/v1/users", users_1.usersRouter);
app.use("/api/v1/webhooks", webhook_1.webhookRouter);
app.use("/api/v1/api-keys", apiKey_1.apiKeyRouter);
app.use("/api/v1/stats", stats_1.statsRouter);
app.use((_req, res) => {
    res.status(404).json({ error: "Route not found" });
});
app.use((error, _req, res, _next) => {
    const message = process.env.NODE_ENV === "production" ? "Something went wrong" : error.message;
    res.status(error.status || 500).json(Object.assign({ error: message }, (process.env.NODE_ENV !== "production" && { stack: error.stack })));
});
process.on("unhandledRejection", (reason, _promise) => {
    console.error("Unhandled Rejection in Express route:", reason);
});
exports.default = app;
