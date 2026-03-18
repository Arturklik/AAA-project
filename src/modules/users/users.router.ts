import { Router } from "express";
import { z } from "zod";
import prisma from "../../config/db";
import { authMiddleware } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

const router = Router();
router.use(authMiddleware);

const updateSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

router.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      lastSeen: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  res.json(user);
});

router.patch("/me", async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: parsed.data,
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      lastSeen: true,
      createdAt: true,
    },
  });

  res.json(user);
});

router.get("/search", async (req, res) => {
  const q = req.query.q as string;
  if (!q || q.length < 1) {
    throw new AppError(400, "Search query is required");
  }

  const users = await prisma.user.findMany({
    where: {
      username: { contains: q, mode: "insensitive" },
      id: { not: req.user!.id },
    },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      lastSeen: true,
    },
    take: 20,
  });

  res.json(users);
});

router.get("/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      lastSeen: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  res.json(user);
});

export default router;
