import { commonSchemas } from "./common";
import { userSchemas } from "./user";
import { apiKeySchemas } from "./apiKey";
import { webhookSchemas } from "./webhook";
import { auditSchemas } from "./audit";
import { statsSchemas } from "./stats";

export const allSchemas = {
  ...commonSchemas,
  ...userSchemas,
  ...apiKeySchemas,
  ...webhookSchemas,
  ...auditSchemas,
  ...statsSchemas,
};
