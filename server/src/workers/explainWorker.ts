import { consume } from "../queue/bus";
import { prisma } from "../config/db";
import { generateThreatExplanation, type ThreatContext } from "../services/aiExplanation";

export async function startExplainWorker() {
  await consume("threat.explain", async (payload) => {
    const { threatId, context } = payload as { threatId: string; context: ThreatContext };
    const full = await generateThreatExplanation(context);
    await prisma.threat.update({
      where: { id: threatId },
      data: { description: full },
    });
  });
}
