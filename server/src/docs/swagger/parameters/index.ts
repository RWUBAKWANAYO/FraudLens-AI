import { commonParameters } from "./common";
import { auditParameters } from "./audit";
import { webhookParameters } from "./webhook";

export const allParameters = {
  ...commonParameters,
  ...auditParameters,
  ...webhookParameters,
};
