"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allParameters = void 0;
const common_1 = require("./common");
const audit_1 = require("./audit");
const webhook_1 = require("./webhook");
exports.allParameters = Object.assign(Object.assign(Object.assign({}, common_1.commonParameters), audit_1.auditParameters), webhook_1.webhookParameters);
