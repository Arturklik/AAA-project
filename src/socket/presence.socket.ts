import { Server, Socket } from "socket.io";
import { z } from "zod";
import prisma from "../config/db";
import redis from "../config/redis";

const typingSchema = z.object({
  chatId: z.string().uuid(),
});

export function registerPresenceHandlers(io: Server, socket: Socket): void {
  const userId: string = (socket.data as { userId: string }).userId;
  const username: string = (socket.data as { username: string }).username;

  socket.on("typing:start", async (data: unknown) => {
    try {
      const parsed = typingSchema.safeParse(data);
      if (!parsed.success) return;

      const { chatId } = parsed.data;

      const membership = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!membership) return;

      socket.to(`chat:${chatId}`).emit("typing:update", {
        chatId,
        userId,
        username,
        isTyping: true,
      });

      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("typing:start error:", err);
    }
  });

  socket.on("typing:stop", async (data: unknown) => {
    try {
      const parsed = typingSchema.safeParse(data);
      if (!parsed.success) return;

      const { chatId } = parsed.data;

      const membership = await prisma.chatMember.findUnique({
        where: { chatId_userId: { chatId, userId } },
      });
      if (!membership) return;

      socket.to(`chat:${chatId}`).emit("typing:update", {
        chatId,
        userId,
        username,
        isTyping: false,
      });

      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("typing:stop error:", err);
    }
  });

  socket.on("disconnect", async () => {
    try {
      await redis.del(`online:${userId}`);

      await prisma.user.update({
        where: { id: userId },
        data: { lastSeen: new Date() },
      });

      // Notify all chats this user belongs to
      const memberships = await prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });

      for (const { chatId } of memberships) {
        socket.to(`chat:${chatId}`).emit("user:offline", { userId, username });
      }
    } catch (err) {
      console.error("disconnect error:", err);
    }
  });
}
