import { prisma } from "../config/db";
import { pushAlert } from "../config/socket";

export async function createAndDispatchAlert(input: {
  companyId: string;
  title: string;
  summary: string;
  severity?: "info" | "low" | "medium" | "high" | "critical";
  recordId?: string | null;
  threatId?: string | null;
  payload?: any;
}) {
  console.log("Creating alert for company:", input.companyId);

  const alert = await prisma.alert.create({
    data: {
      companyId: input.companyId,
      recordId: input.recordId || null,
      threatId: input.threatId || null,
      title: input.title,
      summary: input.summary,
      severity: input.severity || "medium",
      payload: input.payload || {},
    },
  });

  console.log("ALERT CREATED:", alert.id, "for company:", input.companyId);

  // Realtime push to UI
  try {
    pushAlert(input.companyId, {
      type: "threat",
      alertId: alert.id,
      ...input,
      createdAt: new Date().toISOString(),
    });
    console.log("Alert pushed via socket for company:", input.companyId);
  } catch (error) {
    console.error("Failed to push alert via socket:", error);
  }

  return alert;
}
