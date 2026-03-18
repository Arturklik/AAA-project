import { Router } from "express";
import multer from "multer";
import path from "path";
import prisma from "../../config/db";
import { minioClient, BUCKET } from "../../config/minio";
import { authMiddleware } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

const router = Router();
router.use(authMiddleware);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 200);
}

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    throw new AppError(400, "No file provided");
  }

  const userId = req.user!.id;
  const originalName = sanitizeFilename(req.file.originalname);
  const ext = path.extname(originalName);
  const storageKey = `${userId}/${Date.now()}-${originalName}`;

  await minioClient.putObject(BUCKET, storageKey, req.file.buffer, req.file.size, {
    "Content-Type": req.file.mimetype,
  });

  const file = await prisma.file.create({
    data: {
      uploaderId: userId,
      filename: originalName,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      storageKey,
    },
  });

  res.status(201).json({ fileId: file.id, filename: file.filename, mimeType: file.mimeType, sizeBytes: file.sizeBytes });
});

export default router;
