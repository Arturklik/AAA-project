import { Router } from "express";
import prisma from "../../config/db";
import { authMiddleware } from "../../middleware/auth";
import { AppError } from "../../middleware/errorHandler";

const router = Router();
router.use(authMiddleware);

router.delete("/:id", async (req, res) => {
  const userId = req.user!.id;
  const messageId = req.params.id;

  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError(404, "Message not found");
  }

  if (message.senderId !== userId) {
    throw new AppError(403, "You can only delete your own messages");
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true, content: null },
  });

  res.json(updated);
});

export default router;
