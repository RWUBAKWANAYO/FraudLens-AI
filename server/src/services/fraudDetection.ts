import { prisma } from "../config/db";
import { io } from "../server";

type TxInput = {
  amount: number;
  userId: string;
  transactionType?: string;
  notes?: string;
  timestamp?: string;
};

export async function checkTransaction(input: TxInput) {
  const {
    amount,
    userId,
    transactionType = "expense",
    notes,
    timestamp = new Date().toISOString(),
  } = input;

  const employee = await prisma.employee.findUnique({
    where: { id: userId },
  });

  if (!employee) {
    throw new Error(`Employee with ID ${userId} not found. Use a seeded employee ID.`);
  }

  const isFraud = amount > 1000 || /gift\s?cards?/i.test(notes || "");

  const tx = await prisma.financialLog.create({
    data: {
      employeeId: userId,
      transactionType,
      amount,
      notes,
      timestamp: new Date(timestamp),
    },
  });

  let threatId: string | null = null;
  if (isFraud) {
    const threat = await prisma.threat.create({
      data: {
        employeeId: userId,
        threatType: "fraud",
        description: `Suspicious transaction ${tx.id} amount ${amount}`,
        confidenceScore: amount > 5000 ? 0.9 : 0.7,
        status: "open",
      },
    });
    threatId = threat.id;

    io.emit("fraudDetected", {
      threatId: threat.id,
      transactionId: tx.id,
      employeeId: userId,
      amount,
      timestamp: tx.timestamp,
    });
  }

  return {
    transactionId: tx.id,
    isFraud,
    threatId,
    alert: isFraud ? "⚠️ Fraud suspected!" : "✅ Safe transaction",
  };
}
