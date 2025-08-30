import { commonResponses } from "./common";
import { authResponses } from "./auth";
import { apiKeyResponses } from "./apiKey";
import { userResponses } from "./user";
import { webhookResponses } from "./webhook";
import { auditResponses } from "./audit";

export const allResponses = {
  ...commonResponses,
  ...authResponses,
  ...apiKeyResponses,
  ...userResponses,
  ...webhookResponses,
  ...auditResponses,
};
