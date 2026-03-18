import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { activateKey, refreshToken } from "./auth.service";
import { AppError } from "../../middleware/errorHandler";

const router = Router();

const activateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later" },
});

const activateSchema = z.object({
  key: z
    .string()
    .regex(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i, "Invalid key format"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

router.post("/activate", activateLimiter, async (req, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const { key, username } = parsed.data;
  const tokens = await activateKey(key.toUpperCase(), username);
  res.status(201).json(tokens);
});

router.post("/refresh", async (req, res) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, parsed.error.issues[0].message);
  }

  const tokens = await refreshToken(parsed.data.refreshToken);
  res.json(tokens);
});

export default router;
