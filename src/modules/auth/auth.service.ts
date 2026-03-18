import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../config/db";
import { AppError } from "../../middleware/errorHandler";

if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_SECRET and JWT_REFRESH_SECRET must be set in environment");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

function generateRawKey(): string {
  const bytes = crypto.randomBytes(8);
  const hex = bytes.toString("hex").toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

function signTokens(userId: string, username: string) {
  const accessToken = jwt.sign({ id: userId, username }, JWT_SECRET, {
    expiresIn: "30d",
  });
  const refreshToken = jwt.sign({ id: userId, username }, JWT_REFRESH_SECRET, {
    expiresIn: "60d",
  });
  return { accessToken, refreshToken };
}

export async function generateKey(): Promise<string> {
  const rawKey = generateRawKey();
  const keyHash = await bcrypt.hash(rawKey, 12);
  await prisma.activationKey.create({ data: { keyHash } });
  return rawKey;
}

export async function activateKey(
  rawKey: string,
  username: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const unusedKeys = await prisma.activationKey.findMany({
    where: { used: false },
  });

  let matchedKey: (typeof unusedKeys)[number] | null = null;
  for (const key of unusedKeys) {
    const isMatch = await bcrypt.compare(rawKey, key.keyHash);
    if (isMatch) {
      matchedKey = key;
      break;
    }
  }

  if (!matchedKey) {
    throw new AppError(400, "Invalid activation key");
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.activationKey.update({
      where: { id: matchedKey.id },
      data: { used: true },
    });

    const user = await tx.user.create({
      data: {
        username,
        activationKeyId: matchedKey.id,
      },
    });

    return user;
  });

  return signTokens(result.id, result.username);
}

export async function refreshToken(
  token: string
): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as {
      id: string;
      username: string;
    };

    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user) {
      throw new AppError(401, "Invalid refresh token");
    }

    return signTokens(user.id, user.username);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(401, "Invalid or expired refresh token");
  }
}
