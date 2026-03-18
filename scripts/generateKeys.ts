import "dotenv/config";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
});

function generateRawKey(): string {
  const bytes = crypto.randomBytes(8);
  const hex = bytes.toString("hex").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

async function main() {
  const count = parseInt(process.argv[2] || "1", 10);

  if (isNaN(count) || count < 1) {
    console.error("Usage: npx ts-node scripts/generateKeys.ts <count>");
    process.exit(1);
  }

  for (let i = 0; i < count; i++) {
    const rawKey = generateRawKey();
    const keyHash = await bcrypt.hash(rawKey, 12);
    await prisma.activationKey.create({ data: { keyHash } });
    console.log(rawKey);
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
