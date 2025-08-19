// src/config/db.ts
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log("✅ TiDB connected successfully");
  } catch (error) {
    console.error("❌ TiDB connection error:", error);
    process.exit(1);
  }
};
