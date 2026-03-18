import { Server, Socket } from "socket.io";
import { z } from "zod";
import redis from "../config/redis";

const offerSchema = z.object({
  targetUserId: z.string().uuid(),
  offer: z.unknown(),
});

const answerSchema = z.object({
  targetUserId: z.string().uuid(),
  answer: z.unknown(),
});

const iceSchema = z.object({
  targetUserId: z.string().uuid(),
  candidate: z.unknown(),
});

const endSchema = z.object({
  targetUserId: z.string().uuid(),
});

function getTargetSockets(io: Server, targetUserId: string): string[] {
  const sockets: string[] = [];
  for (const [id, s] of io.sockets.sockets) {
    if ((s.data as { userId: string }).userId === targetUserId) {
      sockets.push(id);
    }
  }
  return sockets;
}

export function registerCallHandlers(io: Server, socket: Socket): void {
  const userId: string = (socket.data as { userId: string }).userId;

  socket.on("call:offer", async (data: unknown) => {
    try {
      const parsed = offerSchema.safeParse(data);
      if (!parsed.success) return;

      const targets = getTargetSockets(io, parsed.data.targetUserId);
      for (const sid of targets) {
        io.to(sid).emit("call:offer", {
          fromUserId: userId,
          offer: parsed.data.offer,
        });
      }

      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("call:offer error:", err);
    }
  });

  socket.on("call:answer", async (data: unknown) => {
    try {
      const parsed = answerSchema.safeParse(data);
      if (!parsed.success) return;

      const targets = getTargetSockets(io, parsed.data.targetUserId);
      for (const sid of targets) {
        io.to(sid).emit("call:answer", {
          fromUserId: userId,
          answer: parsed.data.answer,
        });
      }

      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("call:answer error:", err);
    }
  });

  socket.on("call:ice-candidate", async (data: unknown) => {
    try {
      const parsed = iceSchema.safeParse(data);
      if (!parsed.success) return;

      const targets = getTargetSockets(io, parsed.data.targetUserId);
      for (const sid of targets) {
        io.to(sid).emit("call:ice-candidate", {
          fromUserId: userId,
          candidate: parsed.data.candidate,
        });
      }

      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("call:ice-candidate error:", err);
    }
  });

  socket.on("call:end", async (data: unknown) => {
    try {
      const parsed = endSchema.safeParse(data);
      if (!parsed.success) return;

      const targets = getTargetSockets(io, parsed.data.targetUserId);
      for (const sid of targets) {
        io.to(sid).emit("call:end", { fromUserId: userId });
      }

      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("call:end error:", err);
    }
  });
}
