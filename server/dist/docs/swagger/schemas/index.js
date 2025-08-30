"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allSchemas = void 0;
const common_1 = require("./common");
const user_1 = require("./user");
const apiKey_1 = require("./apiKey");
const webhook_1 = require("./webhook");
const audit_1 = require("./audit");
exports.allSchemas = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, common_1.commonSchemas), user_1.userSchemas), apiKey_1.apiKeySchemas), webhook_1.webhookSchemas), audit_1.auditSchemas);
