import { Server, Socket } from "socket.io";
import { z } from "zod";
import prisma from "../config/db";
import redis from "../config/redis";

const sendSchema = z.object({
  chatId: z.string().uuid(),
  content: z.string().nullable().optional(),
  type: z.enum(["text", "image", "video", "audio", "file"]).default("text"),
  fileId: z.string().uuid().optional(),
});

const readSchema = z.object({
  messageId: z.string().uuid(),
  chatId: z.string().uuid(),
});

export function registerMessageHandlers(io: Server, socket: Socket): void {
  const userId: string = (socket.data as { userId: string }).userId;

  socket.on("message:send", async (data: unknown) => {
    try {
      const parsed = sendSchema.safeParse(data);
      if (!parsed.success) return;

      const { chatId, content, type, fileId } = parsed.data;

      // Verify membership
      const membership = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!membership) return;

      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: userId,
          type,
          content: content ?? null,
          fileId: fileId ?? null,
        },
        include: {
          sender: { select: { id: true, username: true, avatarUrl: true } },
          file: true,
        },
      });

      io.to(`chat:${chatId}`).emit("message:new", message);

      // Refresh presence
      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("message:send error:", err);
    }
  });

  socket.on("message:read", async (data: unknown) => {
    try {
      const parsed = readSchema.safeParse(data);
      if (!parsed.success) return;

      const { messageId, chatId } = parsed.data;

      // Verify membership
      const membership = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!membership) return;

      const read = await prisma.messageRead.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId },
        update: { readAt: new Date() },
      });

      io.to(`chat:${chatId}`).emit("message:read_update", {
        messageId,
        userId,
        readAt: read.readAt,
      });

      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("message:read error:", err);
    }
  });
}
