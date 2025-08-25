// server/prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // Create test companies
  const company1 = await prisma.company.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "ACME Corporation",
      slug: "acme-corp",
    },
  });

  const company2 = await prisma.company.upsert({
    where: { slug: "globex-inc" },
    update: {},
    create: {
      name: "Globex Inc",
      slug: "globex-inc",
    },
  });

  const company3 = await prisma.company.upsert({
    where: { slug: "wayne-enterprises" },
    update: {},
    create: {
      name: "Wayne Enterprises",
      slug: "wayne-enterprises",
    },
  });

  // Create some sample rules for testing
  await prisma.rule.upsert({
    where: { id: "high-amount-rule" },
    update: {},
    create: {
      id: "high-amount-rule",
      companyId: company1.id,
      name: "High Amount Transaction",
      definition: {
        gt: ["amount", 10000],
      },
      enabled: true,
    },
  });

  await prisma.rule.upsert({
    where: { id: "suspicious-mcc-rule" },
    update: {},
    create: {
      id: "suspicious-mcc-rule",
      companyId: company1.id,
      name: "Suspicious Merchant Category",
      definition: {
        in: ["mcc", ["4829", "6011"]],
      },
      enabled: true,
    },
  });

  // Create webhook subscriptions for testing
  await prisma.webhookSubscription.upsert({
    where: { id: "test-webhook-1" },
    update: {},
    create: {
      id: "test-webhook-1",
      companyId: company1.id,
      url: "https://webhook.site/83d13f0d-0801-4b0c-875d-39730098eb44", // Fixed URL
      secret: "test-secret-123",
      events: ["threat.created", "alert.created"], // Add events array
      active: true,
    },
  });

  console.log("Seeding completed successfully!");
  console.log("Company IDs for testing:");
  console.log(`- ACME Corporation: ${company1.id}`);
  console.log(`- Globex Inc: ${company2.id}`);
  console.log(`- Wayne Enterprises: ${company3.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    /*@ts-ignore*/
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
