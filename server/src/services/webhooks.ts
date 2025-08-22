import fetch from "node-fetch";
import { prisma } from "../config/db";

export async function dispatchEnterpriseWebhooks(companyId: string, event: any) {
  const subs = await prisma.webhookSubscription.findMany({ where: { companyId, active: true } });
  for (const s of subs) {
    try {
      await fetch(s.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-signature": signBody(s.secret, event),
        },
        body: JSON.stringify(event),
      });
    } catch (e) {
      // store failure for retry (simplified)
      console.error("webhook delivery failed", s.url, e);
    }
  }
}

function signBody(secret: string, payload: any) {
  const crypto = require("crypto");
  return crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
}
