import "dotenv/config";

// Fail fast if critical env vars are missing
const REQUIRED_ENV = ["JWT_SECRET", "JWT_REFRESH_SECRET"] as const;
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

import express from "express";
import http from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import { initMinio } from "./config/minio";
import { errorHandler } from "./middleware/errorHandler";
import { setupSocket } from "./socket";
import authRouter from "./modules/auth/auth.router";
import usersRouter from "./modules/users/users.router";
import chatsRouter from "./modules/chats/chats.router";
import messagesRouter from "./modules/messages/messages.router";
import filesRouter from "./modules/files/files.router";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// Global middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Routes
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/chats", chatsRouter);
app.use("/api/messages", messagesRouter);
app.use("/api/files", filesRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Error handler (must be last)
app.use(errorHandler);

// Socket.io
setupSocket(io);

const PORT = parseInt(process.env.PORT || "3000", 10);

async function start() {
  try {
    await initMinio();
    console.log("MinIO initialized");
  } catch (err) {
    console.warn("MinIO initialization failed (will retry on upload):", err);
  }

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start();
