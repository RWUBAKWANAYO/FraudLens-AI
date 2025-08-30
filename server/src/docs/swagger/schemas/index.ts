import { commonSchemas } from "./common";
import { userSchemas } from "./user";
import { apiKeySchemas } from "./apiKey";
import { webhookSchemas } from "./webhook";
import { auditSchemas } from "./audit";

export const allSchemas = {
  ...commonSchemas,
  ...userSchemas,
  ...apiKeySchemas,
  ...webhookSchemas,
  ...auditSchemas,
};
