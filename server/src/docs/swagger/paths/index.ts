import { apiKeyPaths } from "./apiKeys";
import { authPaths } from "./auth";
import { userPaths } from "./users";
import { webhookPaths } from "./webhooks";
import { auditPaths } from "./audit";
import { statsPaths } from "./stats";

export const allPaths = {
  ...authPaths,
  ...apiKeyPaths,
  ...userPaths,
  ...webhookPaths,
  ...auditPaths,
  ...statsPaths,
};
