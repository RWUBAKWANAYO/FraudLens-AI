"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsRouter = exports.router = void 0;
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const stats_1 = require("../controllers/stats");
exports.router = (0, express_1.Router)();
exports.statsRouter = exports.router;
exports.router.get("/company", auth_1.authenticateTokenOrApiKey, stats_1.getCompanyStats);
