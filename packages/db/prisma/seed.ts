import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

async function main() {
  const alice = await prisma.user.upsert({
    where: { number: "1111111111" },
    update: {},
    create: {
      number: "1111111111",
      password: await bcrypt.hash("alice", 10),
      name: "alice",
      Balance: { create: { amount: 20000, locked: 0 } },
      OnRampTransaction: {
        create: { startTime: new Date(), status: "Success", amount: 20000, token: "token__1", provider: "HDFC Bank" },
      },
    },
  });
  const bob = await prisma.user.upsert({
    where: { number: "2222222222" },
    update: {},
    create: {
      number: "2222222222",
      password: await bcrypt.hash("bob", 10),
      name: "bob",
      Balance: { create: { amount: 2000, locked: 0 } },
      OnRampTransaction: {
        create: { startTime: new Date(), status: "Failure", amount: 2000, token: "token__2", provider: "HDFC Bank" },
      },
    },
  });
  const plans = [
    { code: "MINI",     name: "Soundbox Mini", price: 49900,  description: "Compact speaker, Wi-Fi, 5-day battery" },
    { code: "STANDARD", name: "Soundbox 4G",   price: 99900,  description: "4G SIM, 7-day battery, multilingual" },
    { code: "PRO",      name: "Soundbox Pro",  price: 199900, description: "4G + display screen, 10-day battery" },
  ];
  for (const p of plans) {
    await prisma.soundboxPlan.upsert({ where: { code: p.code }, update: {}, create: p });
  }

  const merchant = await prisma.merchant.upsert({
    where: { email: "merchant@demo.com" },
    update: {},
    create: {
      email: "merchant@demo.com",
      phone: "9999999999",
      name: "Ravi Kumar",
      businessName: "Ravi Tea Stall",
      password: await bcrypt.hash("merchant123", 10),
      auth_type: "Credentials",
      kycStatus: "VERIFIED",
      balance: { create: { amount: 0, locked: 0 } },
    },
  });

  for (let i = 1; i <= 5; i++) {
    const deviceId = `SB-${String(i).padStart(4, "0")}`;
    await prisma.soundbox.upsert({
      where: { deviceId },
      update: {},
      create: { deviceId, secretHash: sha256(`demo-secret-${i}`) },
    });
  }

  console.log({ alice: alice.number, bob: bob.number, merchant: merchant.email });
  console.log("Merchant login:  merchant@demo.com / merchant123");
  console.log("Devices:         SB-0001..SB-0005, secrets demo-secret-1..5");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });