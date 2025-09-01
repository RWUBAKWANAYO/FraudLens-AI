import { commonResponses } from "./common";
import { authResponses } from "./auth";
import { apiKeyResponses } from "./apiKey";
import { userResponses } from "./user";
import { webhookResponses } from "./webhook";
import { auditResponses } from "./audit";
import { statsResponses } from "./stats";

export const allResponses = {
  ...commonResponses,
  ...authResponses,
  ...apiKeyResponses,
  ...userResponses,
  ...webhookResponses,
  ...auditResponses,
  ...statsResponses,
};
