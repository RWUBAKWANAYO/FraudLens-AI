import { apiKeyPaths } from "./apiKeys";
import { authPaths } from "./auth";
import { userPaths } from "./users";
import { webhookPaths } from "./webhooks";
import { auditPaths } from "./audit";

export const allPaths = {
  ...authPaths,
  ...apiKeyPaths,
  ...userPaths,
  ...webhookPaths,
  ...auditPaths,
};
