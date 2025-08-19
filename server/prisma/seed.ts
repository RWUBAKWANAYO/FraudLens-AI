import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const alice = await prisma.employee.upsert({
    where: { email: "alice@company.com" },
    update: {},
    create: {
      name: "Alice Johnson",
      email: "alice@company.com",
      role: "Accountant",
      department: "Finance",
    },
  });

  const bob = await prisma.employee.upsert({
    where: { email: "bob@company.com" },
    update: {},
    create: {
      name: "Bob Smith",
      email: "bob@company.com",
      role: "Sales Lead",
      department: "Sales",
    },
  });

  console.log({ alice, bob });
}

main().finally(async () => prisma.$disconnect());
