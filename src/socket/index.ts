import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "../config/db";
import redis from "../config/redis";
import { registerMessageHandlers } from "./messages.socket";
import { registerPresenceHandlers } from "./presence.socket";
import { registerCallHandlers } from "./calls.socket";

interface AuthPayload {
  id: string;
  username: string;
}

export function setupSocket(io: Server): void {
  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as AuthPayload;
      socket.data.userId = payload.id;
      socket.data.username = payload.username;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", async (socket) => {
    const userId: string = socket.data.userId;
    const username: string = socket.data.username;

    console.log(`User connected: ${username} (${userId})`);

    try {
      // Join all chat rooms the user belongs to
      const memberships = await prisma.chatMember.findMany({
        where: { userId },
        select: { chatId: true },
      });

      for (const { chatId } of memberships) {
        socket.join(`chat:${chatId}`);
      }

      // Set online presence in Redis
      await redis.set(`online:${userId}`, "1", "EX", 60);
    } catch (err) {
      console.error("Socket connection setup error:", err);
    }

    // Register all handlers
    registerMessageHandlers(io, socket);
    registerPresenceHandlers(io, socket);
    registerCallHandlers(io, socket);
  });
}
